package service

import (
	"fmt"

	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	miniflux "miniflux.app/v2/client"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
)

func MinifluxUnreadCount(token string) int {
	// Authentication using API token.
	client := miniflux.NewClient(viper.GetString("miniflux"), token)

	feeds, err := client.Entries(&miniflux.Filter{Status: miniflux.EntryStatusUnread})
	if err != nil {
		return 0
	}
	return feeds.Total
}

const (
	IMAPServer = "imap.qq.com"
	IMAPPort   = 993
)

func QQMailUnreadCount(email string, token string) int {
	// Connect to the IMAP server
	c, err := client.DialTLS(fmt.Sprintf("%s:%d", IMAPServer, IMAPPort), nil)
	if err != nil {
		log.Error("Failed to connect to QQMail IMAP server: ", err)
		return 0
	}
	defer c.Logout()

	// Login
	if err := c.Login(email, token); err != nil {
		log.Error("Failed to login to QQMail IMAP server: ", err)
		return 0
	}

	// Select INBOX
	_, err = c.Select("INBOX", true)
	if err != nil {
		log.Error("Failed to select INBOX: ", err)
		return 0
	}

	// Search unread emails
	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{"\\Seen"}
	ids, err := c.Search(criteria)
	if err != nil {
		log.Error("Failed to search unread emails: ", err)
		return 0
	}

	return len(ids)
}
