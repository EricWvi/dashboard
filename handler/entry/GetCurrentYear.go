package entry

import (
	"time"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetCurrentYear(c *gin.Context, req *GetCurrentYearRequest) *GetCurrentYearResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	counts, err := model.CountCurrentYear(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	// Ensure start of year and today are always included
	currentYear := time.Now().Year()
	today := time.Now()
	todayStr := today.Format("2006-01-02")
	yearStartStr := time.Date(currentYear, 1, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")

	// Check if last entry is not today
	if len(counts) == 0 || counts[len(counts)-1].Date != todayStr {
		counts = append(counts, model.CurrentYearCount{
			Date:  todayStr,
			Count: 0,
			Level: 0,
		})
	}

	// Check if first entry is not start of year
	if len(counts) == 0 || counts[0].Date != yearStartStr {
		counts = append([]model.CurrentYearCount{{
			Date:  yearStartStr,
			Count: 0,
			Level: 0,
		}}, counts...)
	}

	// Calculate total count
	totalCount := 0
	for _, count := range counts {
		totalCount += count.Count
	}

	return &GetCurrentYearResponse{
		Activity: counts,
		Count:    totalCount,
	}
}

type GetCurrentYearRequest struct {
}

type GetCurrentYearResponse struct {
	Activity []model.CurrentYearCount `json:"activity"`
	Count    int                      `json:"count"`
}
