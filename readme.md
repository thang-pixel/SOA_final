
## build lại từng service để chạy swarm
docker build -t api-gateway:latest ./BE/api-gateway

docker build -t auth-service:latest ./BE/auth-service

docker build -t user-service:latest ./BE/user-service

docker build -t payment-service:latest ./BE/payment-service

docker build -t notification-service:latest ./BE/notification-service

docker build -t tuition-service:latest ./BE/Tuition-service

docker build -t frontend:latest ./frontend


## khởi tạo swarm lần đầu
docker swarm init

## remove hoặc scale notification với swarm
docker stack rm mystack
docker stack deploy -c docker-compose.yml mystack

## kiểm tra scale
docker service ls

## kiểm tra balancing 
docker logs <container_id>