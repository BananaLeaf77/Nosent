package whatsapp

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	_ "github.com/lib/pq"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
	"gorm.io/gorm"
)

type Status string

const (
	StatusDisconnected Status = "disconnected"
	StatusWaitingQR    Status = "waiting_qr"
	StatusConnected    Status = "connected"
)

type Client struct {
	mu       sync.RWMutex
	waClient *whatsmeow.Client
	db       *gorm.DB
	status   Status
	qrChan   chan string
	qrCode   string // latest QR as base64 or raw string
}

func NewClient(db *gorm.DB) *Client {
	return &Client{
		db:     db,
		status: StatusDisconnected,
		qrChan: make(chan string, 1),
	}
}

// Connect initialises the whatsmeow client and restores session if available.
func (c *Client) Connect() error {
	dbPath := getEnv("WA_DB_PATH", "./wa_session.db")
	dbLog := waLog.Stdout("Database", "WARN", true)

	container, err := sqlstore.New("sqlite3", "file:"+dbPath+"?_foreign_keys=on", dbLog)
	if err != nil {
		return fmt.Errorf("sqlstore: %w", err)
	}

	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		return fmt.Errorf("get device: %w", err)
	}

	clientLog := waLog.Stdout("Client", "WARN", true)
	c.waClient = whatsmeow.NewClient(deviceStore, clientLog)
	c.waClient.AddEventHandler(c.handleEvent)

	if c.waClient.Store.ID == nil {
		// New device — need QR scan
		qrChan, _ := c.waClient.GetQRChannel(context.Background())
		if err := c.waClient.Connect(); err != nil {
			return fmt.Errorf("connect: %w", err)
		}
		c.setStatus(StatusWaitingQR)

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					c.mu.Lock()
					c.qrCode = evt.Code
					c.mu.Unlock()
					// Non-blocking send
					select {
					case c.qrChan <- evt.Code:
					default:
					}
				}
			}
		}()
	} else {
		// Existing session
		if err := c.waClient.Connect(); err != nil {
			return fmt.Errorf("connect: %w", err)
		}
		c.setStatus(StatusConnected)
	}

	return nil
}

// GetQRCode returns the current QR code string (for frontend polling).
func (c *Client) GetQRCode() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.qrCode
}

// GetStatus returns current connection status.
func (c *Client) GetStatus() Status {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.status
}

// SendMessage sends a text message to a phone number like "6281234567890".
func (c *Client) SendMessage(phone, message string) error {
	if c.GetStatus() != StatusConnected {
		return fmt.Errorf("whatsapp not connected")
	}

	jid, err := types.ParseJID(phone + "@s.whatsapp.net")
	if err != nil {
		return fmt.Errorf("invalid phone %s: %w", phone, err)
	}

	msg := &waProto.Message{
		Conversation: proto.String(message),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err = c.waClient.SendMessage(ctx, jid, msg)
	return err
}

// Logout disconnects and clears the session.
func (c *Client) Logout() error {
	if c.waClient == nil {
		return nil
	}
	err := c.waClient.Logout()
	c.setStatus(StatusDisconnected)
	c.mu.Lock()
	c.qrCode = ""
	c.mu.Unlock()
	return err
}

func (c *Client) handleEvent(evt interface{}) {
	switch evt.(type) {
	case *whatsmeow.ConnectedEvent:
		c.setStatus(StatusConnected)
	case *whatsmeow.DisconnectedEvent:
		c.setStatus(StatusDisconnected)
	}
}

func (c *Client) setStatus(s Status) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.status = s
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
