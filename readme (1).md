
## build lại từng service để chạy swarm
docker build -t api-gateway:latest ./BE/api-gateway

docker build -t auth-service:latest ./BE/auth-service

docker build -t inventory-service:latest ./BE/inventory-service

docker build -t order-service:latest ./BE/order-service

docker build -t notification-service:latest ./BE/notification-service

docker build -t activity-service:latest ./BE/activity-service

docker build -t report-service:latest ./BE/report-service

docker build -t frontend:latest ./FE/vite-SOA_final


## khởi tạo swarm lần đầu
docker swarm init

## remove hoặc scale notification với swarm
<!-- docker stack rm soa-stack -->
docker stack deploy -c docker-compose.yml soa-stack

## kiểm tra scale
docker service ls

# Xem trạng thái các task của service
docker service ps soa-stack_notification-service

# Thực hiện rolling update
docker service update --force soa-stack_notification-service
# Theo dõi quá trình update

watch docker service ps soa-stack_notification-service
# scale
docker service scale soa-stack_notification-service=
