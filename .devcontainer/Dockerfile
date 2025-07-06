FROM node:22-slim

RUN npm install -g pnpm

RUN apt-get update && apt-get install -y \
    sudo \
    git

# sudoでのパスワードなしでの実行を許可するための設定
RUN echo 'node ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers