package handlers

import (
	"fmt"
	"strings"

	"github.com/xuri/excelize/v2"
	"github.com/yourorg/whatsapp-broadcast/internal/models"
)

// headerMap maps common variations of column names to our canonical field names
var headerMap = map[string]string{
	// Name
	"patient name": "name",
	"name":         "name",
	"nama":         "name",
	"nama pasien":  "name",
	// Phone
	"phone":        "phone",
	"phone number": "phone",
	"no hp":        "phone",
	"nomor hp":     "phone",
	"no. hp":       "phone",
	"whatsapp":     "phone",
	"wa":           "phone",
	// Checkup date
	"next checkup":      "checkup_date",
	"checkup date":      "checkup_date",
	"next checkup date": "checkup_date",
	"tanggal kontrol":   "checkup_date",
	"tgl kontrol":       "checkup_date",
	// Doctor
	"doctor":      "doctor_name",
	"dokter":      "doctor_name",
	"doctor name": "doctor_name",
	// Clinic
	"clinic":          "clinic_location",
	"clinic location": "clinic_location",
	"klinik":          "clinic_location",
	"lokasi":          "clinic_location",
	// Notes
	"notes":     "notes",
	"catatan":   "notes",
	"keterangan": "notes",
}

// ParseExcel reads the first sheet of the uploaded file and returns patients.
func ParseExcel(path string, broadcastID uint) ([]models.Patient, error) {
	f, err := excelize.OpenFile(path)
	if err != nil {
		return nil, fmt.Errorf("open excel: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("excel has no sheets")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("get rows: %w", err)
	}
	if len(rows) < 2 {
		return nil, fmt.Errorf("excel must have at least a header row and one data row")
	}

	// Map header -> column index
	colIndex := map[string]int{}
	for i, h := range rows[0] {
		normalized := strings.ToLower(strings.TrimSpace(h))
		if canonical, ok := headerMap[normalized]; ok {
			colIndex[canonical] = i
		}
	}

	if _, ok := colIndex["name"]; !ok {
		return nil, fmt.Errorf("column 'Patient Name' (or similar) not found in Excel")
	}
	if _, ok := colIndex["phone"]; !ok {
		return nil, fmt.Errorf("column 'Phone Number' (or similar) not found in Excel")
	}

	var patients []models.Patient
	for rowNum, row := range rows[1:] {
		get := func(field string) string {
			idx, ok := colIndex[field]
			if !ok || idx >= len(row) {
				return ""
			}
			return strings.TrimSpace(row[idx])
		}

		phone := sanitizePhone(get("phone"))
		name := get("name")
		if name == "" || phone == "" {
			continue // skip empty rows
		}

		_ = rowNum
		patients = append(patients, models.Patient{
			BroadcastID:    broadcastID,
			Name:           name,
			Phone:          phone,
			CheckupDate:    get("checkup_date"),
			DoctorName:     get("doctor_name"),
			ClinicLocation: get("clinic_location"),
			Notes:          get("notes"),
		})
	}

	return patients, nil
}

// sanitizePhone strips non-numeric chars and ensures country code prefix.
func sanitizePhone(raw string) string {
	var b strings.Builder
	for _, r := range raw {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	s := b.String()
	// If starts with 0, assume Indonesian number -> replace with 62
	if strings.HasPrefix(s, "0") {
		s = "62" + s[1:]
	}
	return s
}
