FROM php:8.3-cli-bookworm

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl git libpq-dev unzip \
    && docker-php-ext-install bcmath pcntl pdo_pgsql pgsql \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .

RUN composer install --no-interaction --prefer-dist --optimize-autoloader \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

COPY docker/start-api.sh /usr/local/bin/start-api

RUN chmod +x /usr/local/bin/start-api

EXPOSE 8000

CMD ["start-api"]
