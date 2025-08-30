package echo

import (
	"sort"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListYears(c *gin.Context, req *ListYearsRequest) *ListYearsResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Echo_Type, req.Type)

	years, err := model.ListYears(config.DB.WithContext(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	sort.Sort(sort.Reverse(sort.IntSlice(years)))

	return &ListYearsResponse{
		Years: years,
	}
}

type ListYearsRequest struct {
	Type string `json:"type"`
}

type ListYearsResponse struct {
	Years []int `json:"years"`
}
