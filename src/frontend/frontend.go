package main

import (
	"io/ioutil"
	"encoding/json"
	"fmt"
	"log"
	"lib/lookup"
	"net/http"
	"strconv"
	structs "structs"
)

func index_handler(w http.ResponseWriter, r *http.Request) {
	log.Println("index requested")

	data, err := ioutil.ReadFile("html/index.html")
	if err != nil {
		log.Println("index.html not present!")
		http.NotFound(w, r)
	} else {
		w.Write(data)
	}
}

func invalidRequest(w http.ResponseWriter) {
	
}


func request_bestbuild(w http.ResponseWriter, r *http.Request) {	
	values := r.URL.Query()
	
	gold, err := strconv.ParseInt( values.Get("gold"), 10, 32 )
	if err != nil || len(values.Get("champ")) == 0 {
		invalidRequest(w)
	}
		
	criteria := structs.StageCriteria{
		Gold: int(gold),
		Champion: structs.PlayerChampion{
			Name: values.Get("champ"),
		},
	}
	key := lookup.GetKey(criteria)
	fmt.Println(key)
	data, err := lookup.Get(key)
	
	w.Header().Set("Content-Type", "application/json")
	// Couldn't get any information about this combination. Return some
	// sort of error to the frontend.
	if err != nil {
		log.Println(err)
		
		result := structs.PermutationResult{
			Valid: false,
		}
		output, _ := json.Marshal( result )
		w.Write( []byte(output) )
	} else {
		w.Write( []byte(data) )
	}
}

func main() {
	// Listen 	
	http.HandleFunc("/", index_handler)
	http.HandleFunc("/best/", request_bestbuild)

	// Serve any files in static/ directly from the filesystem.
	http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		log.Println("GET", r.URL.Path[1:])
		http.ServeFile(w, r, "html/"+r.URL.Path[1:])
	})
	
	log.Println("Awaiting requests...")
	log.Fatal("Couldn't listen on port 8088:", http.ListenAndServe(":8088", nil))
}
