package service

import (
	"errors"
	"fmt"

	"github.com/spf13/viper"
	miniflux "miniflux.app/v2/client"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
)

func MinifluxUnreadCount(token string) (int, error) {
	// Authentication using API token.
	client := miniflux.NewClient(viper.GetString("miniflux"), token)

	feeds, err := client.Entries(&miniflux.Filter{Status: miniflux.EntryStatusUnread})
	if err != nil {
		return 0, errors.New("Failed to fetch unread entries from Miniflux: " + err.Error())
	}
	return feeds.Total, nil
}

const (
	IMAPServer = "imap.qq.com"
	IMAPPort   = 993
)

func QQMailUnreadCount(email string, token string) (int, error) {
	// Connect to the IMAP server
	c, err := client.DialTLS(fmt.Sprintf("%s:%d", IMAPServer, IMAPPort), nil)
	if err != nil {
		return 0, errors.New("Failed to connect to QQMail IMAP server: " + err.Error())
	}
	defer c.Logout()

	// Login
	if err := c.Login(email, token); err != nil {
		return 0, errors.New("Failed to login to QQMail IMAP server: " + err.Error())
	}

	// Select INBOX
	_, err = c.Select("INBOX", true)
	if err != nil {
		return 0, errors.New("Failed to select INBOX: " + err.Error())
	}

	// Search unread emails
	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{"\\Seen"}
	ids, err := c.Search(criteria)
	if err != nil {
		return 0, errors.New("Failed to search unread emails: " + err.Error())
	}

	return len(ids), nil
}
