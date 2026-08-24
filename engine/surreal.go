package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/surrealdb/surrealdb.go"
)

var (
	ctx = context.Background()
	db  *surrealdb.Session
)

func MustReadQuery(path string) string {
	data, err := os.ReadFile("../" + path + ".surql")
	if err != nil {
		panic(fmt.Sprintf("Failed to read file: %s", path))
	}

	return string(data)
}

func Query[TResult any](sql string, vars map[string]any) ([]surrealdb.QueryResult[TResult], error) {
	q, err := surrealdb.Query[TResult](ctx, db, sql, vars)
	if err != nil {
		return nil, err
	}

	return *q, nil
}

var initQuery = MustReadQuery("init")

func init() {
	// try both ports (8003 for tournament server, 8000 for default)
	endpoints := []string{"ws://localhost:8003", "ws://localhost:8000"}
	var database *surrealdb.DB
	var err error
	for attempt := 0; ; attempt++ {
		for _, ep := range endpoints {
			database, err = surrealdb.FromEndpointURLString(ctx, ep)
			if err == nil {
				fmt.Println("connected to", ep)
				goto connected
			}
			fmt.Printf("failed to connect to %s: %v\n", ep, err)
		}
		if attempt >= 4 {
			fmt.Println("Multiple connection attempts failed")
			panic(err)
		}
		fmt.Println("Retrying connection in 1 second...")
		time.Sleep(time.Second)
	}

connected:
	if db, err = database.Attach(ctx); err != nil {
		fmt.Println("Failed to attach to database")
		panic(err)
	}

	authData := surrealdb.Auth{
		Username: "root",
		Password: "root",
	}

	if _, err := db.SignIn(ctx, authData); err != nil {
		fmt.Println("Failed to sign in to database")
		panic(err)
	}

	if err := db.Use(ctx, "main", "main"); err != nil {
		fmt.Println("Failed to select namespace and database")
		panic(err)
	}

	if _, err := Query[any](initQuery, nil); err != nil {
		fmt.Println("Failed to run init query")
		panic(err)
	}

	fmt.Println("Database successfully connected")
}
