#!/bin/bash

set -e

function print_help {
    echo "Available options:"
    echo " start commands (rasa cmd line arguments)  - Start RasaNLU server"
    echo " start -h                                  - Print RasaNLU help"
    echo " help                                      - Print this help"
    echo " run                                       - Run an arbitrary command inside the container"
}

case ${1} in
    start)
        exec python -m rasa_core.server -d models/dialogue -u models/nlu/current 
        ;;
    run)
        exec "${@:2}"
        ;;
    *)
        print_help
        ;;
esac


