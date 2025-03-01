#!/usr/bin/env bash
# Use this script to stop the running database container

DB_CONTAINER_NAME="games-postgres"

if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install Docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
  docker stop "$DB_CONTAINER_NAME"
  echo "Database container '$DB_CONTAINER_NAME' has been stopped"
  exit 0
else
  echo "No running database container found."
  exit 0
fi
