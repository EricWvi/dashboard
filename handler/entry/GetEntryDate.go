package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetEntryDate(c *gin.Context, req *GetEntryDateRequest) *GetEntryDateResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	dates, err := model.FindDates(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	var result []Year
	var currentYear *Year
	var currentMonth *Month
	for _, r := range dates {
		// New year
		if currentYear == nil || currentYear.Year != r.Year {
			result = append(result, Year{
				Year:   r.Year,
				Months: []Month{},
			})
			currentYear = &result[len(result)-1]
			currentMonth = nil
		}

		// New month
		if currentMonth == nil || currentMonth.Month != r.Month {
			currentYear.Months = append(currentYear.Months, Month{
				Month: r.Month,
				Days:  []int{},
			})
			currentMonth = &currentYear.Months[len(currentYear.Months)-1]
		}

		// Append day
		currentMonth.Days = append(currentMonth.Days, r.Day)
	}

	return &GetEntryDateResponse{
		Total:      len(dates),
		EntryDates: result,
	}
}

type GetEntryDateRequest struct {
}

type GetEntryDateResponse struct {
	Total      int    `json:"total"`
	EntryDates []Year `json:"entryDates"`
}

type Day int

type Month struct {
	Month int   `json:"month"`
	Days  []int `json:"days"`
}

type Year struct {
	Year   int     `json:"year"`
	Months []Month `json:"months"`
}
