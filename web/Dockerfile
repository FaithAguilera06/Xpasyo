# Use the official PHP 8.2 Apache image
FROM php:8.2-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-install zip pdo pdo_mysql

# Enable Apache modules
RUN a2enmod rewrite headers

# Configure PHP
RUN echo "error_reporting = E_ALL" > /usr/local/etc/php/conf.d/error.ini \
    && echo "display_errors = On" >> /usr/local/etc/php/conf.d/error.ini \
    && echo "log_errors = On" >> /usr/local/etc/php/conf.d/error.ini \
    && echo "error_log = /var/log/php_errors.log" >> /usr/local/etc/php/conf.d/error.ini

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . .

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && find /var/www/html -type d -exec chmod 755 {} \; \
    && find /var/www/html -type f -exec chmod 644 {} \; \
    && chmod -R 777 /var/www/html/json_files \
    && chmod 755 /var/www/html/pages \
    && chmod 644 /var/www/html/.htaccess

# Copy Apache configuration
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf

# Ensure the entry point script is executable
RUN chmod +x /usr/local/bin/docker-php-entrypoint

# Expose port 80
EXPOSE 80

# Start Apache in the foreground
CMD ["apache2-foreground"]
