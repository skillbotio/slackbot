echo "Mongo URL: $1"
echo "FIP: $2"
echo "Branch/Tag: $3"
echo "Service: $4"
echo "Env: $5"

docker login -e $DOCKER_EMAIL -u $DOCKER_USER -p $DOCKER_PASS
docker build -f docker/Dockerfile -t bespoken/logless-server:$3 .
docker push bespoken/logless-server:$3
./hyper config --accesskey $HYPER_KEY --secretkey $HYPER_SECRET
./hyper login -e $DOCKER_EMAIL -u $DOCKER_USER -p $DOCKER_PASS
./hyper pull bespoken/logless-server:$3
./hyper rm -f $4 || true
./hyper run -d -e BST_MONGO_URL=$1 \
    -e env=$5 \
    -e SSL_KEY="$SSL_KEY" \
    -e SSL_CERT="$SSL_CERT" \
    --name $4 \
    --size s4 \
    --restart always \
    -P bespoken/logless-server:$3

./hyper fip attach -f $2 $4
