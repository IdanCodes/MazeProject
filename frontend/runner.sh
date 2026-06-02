if [ "$#" -lt 1 ]; then
    echo "Not enough arguments"
elif [ "$1" == "vite" ]; then
    echo "Starting vite dev server..."
    npx vite
elif [ "$1" == "electron" ]; then
    echo "Starting electron instance..."
    npx electron electron/main.ts
fi
# if [ "$#" -lt 1 ]; then
#     echo "Not enough arguments"
# elif [ "$1" == "client" ]; then
#     echo "Starting up client!"
#     npx vite
# elif [ "$1" == "electron" ]; then
#     echo "Starting electron instance..."
#     npx electron electron/main.ts
# fi