{
  "rewrites": [
    {
      "source": "/iraq.m3u8",
      "destination": "/api/proxy?target=http://12k-service.com:8080/live/a5n1qj2z7h/z7san35uxz/1269943.m3u8"
    },
    {
      "source": "/proxy/:target",
      "destination": "/api/proxy?target=:target"
    }
  ]
}
