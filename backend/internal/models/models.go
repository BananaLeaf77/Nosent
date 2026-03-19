package models

import (
	"time"

	"gorm.io/gorm"
)

// BroadcastStatus represents the state of a broadcast
type BroadcastStatus string

const (
	StatusPending   BroadcastStatus = "pending"
	StatusSending   BroadcastStatus = "sending"
	StatusCompleted BroadcastStatus = "completed"
	StatusFailed    BroadcastStatus = "failed"
	StatusCancelled BroadcastStatus = "cancelled"
)

// ScheduleType defines how the broadcast recurs
type ScheduleType string

const (
	ScheduleOnce      ScheduleType = "once"
	ScheduleRecurring ScheduleType = "recurring"
)

// Broadcast represents one scheduled broadcast session
type Broadcast struct {
	gorm.Model
	Name         string          `json:"name" gorm:"not null"`
	ExcelPath    string          `json:"excel_path" gorm:"not null"`     // stored file path
	ExcelName    string          `json:"excel_name" gorm:"not null"`     // original filename
	MessageTpl   string          `json:"message_tpl" gorm:"not null"`    // message template with {{placeholders}}
	ScheduleType ScheduleType    `json:"schedule_type" gorm:"not null"`
	ScheduledAt  *time.Time      `json:"scheduled_at"`  // for one-time sends
	CronExpr     string          `json:"cron_expr"`     // for recurring (e.g. "0 8 1 * *")
	Status       BroadcastStatus `json:"status" gorm:"default:'pending'"`
	TotalCount   int             `json:"total_count"`
	SentCount    int             `json:"sent_count"`
	FailedCount  int             `json:"failed_count"`
	LastSentAt   *time.Time      `json:"last_sent_at"`
	CronID       int             `json:"cron_id" gorm:"-"` // runtime only, not stored
	Patients     []Patient       `json:"patients,omitempty" gorm:"foreignKey:BroadcastID"`
	Logs         []MessageLog    `json:"logs,omitempty" gorm:"foreignKey:BroadcastID"`
}

// Patient is one row from the uploaded Excel
type Patient struct {
	gorm.Model
	BroadcastID    uint   `json:"broadcast_id" gorm:"not null;index"`
	Name           string `json:"name" gorm:"not null"`
	Phone          string `json:"phone" gorm:"not null"` // with country code e.g. 6281234567890
	CheckupDate    string `json:"checkup_date"`
	DoctorName     string `json:"doctor_name"`
	ClinicLocation string `json:"clinic_location"`
	Notes          string `json:"notes"`
}

// MessageLog tracks each individual send attempt
type MessageLog struct {
	gorm.Model
	BroadcastID uint      `json:"broadcast_id" gorm:"not null;index"`
	PatientID   uint      `json:"patient_id" gorm:"not null;index"`
	PatientName string    `json:"patient_name"`
	Phone       string    `json:"phone"`
	Status      string    `json:"status"` // "sent" | "failed"
	Error       string    `json:"error"`
	SentAt      time.Time `json:"sent_at"`
}

// BroadcastSummary is a lightweight read model for the history list
type BroadcastSummary struct {
	ID           uint            `json:"id"`
	Name         string          `json:"name"`
	ExcelName    string          `json:"excel_name"`
	ScheduleType ScheduleType    `json:"schedule_type"`
	ScheduledAt  *time.Time      `json:"scheduled_at"`
	CronExpr     string          `json:"cron_expr"`
	Status       BroadcastStatus `json:"status"`
	TotalCount   int             `json:"total_count"`
	SentCount    int             `json:"sent_count"`
	FailedCount  int             `json:"failed_count"`
	LastSentAt   *time.Time      `json:"last_sent_at"`
	CreatedAt    time.Time       `json:"created_at"`
}
