package echo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListEchoes(c *gin.Context, req *ListEchoesRequest) *ListEchoesResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Echo_Type, req.Type)
	if req.Year != 0 {
		m.Eq(model.Echo_Year, req.Year)
	}
	if req.Sub != 0 {
		m.Eq(model.Echo_Sub, req.Sub)
	}

	echoes, err := model.ListEchoes(config.DB, m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListEchoesResponse{
		Echoes: echoes,
	}
}

type ListEchoesRequest struct {
	Year int    `json:"year"`
	Sub  int    `json:"sub"`
	Type string `json:"type"`
}

type ListEchoesResponse struct {
	Echoes []model.Echo `json:"echoes"`
}
