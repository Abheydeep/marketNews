package com.marketnarrative.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String PROPERTY_SOURCE_NAME = "renderDatabaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (!isPostgresUrl(databaseUrl) || environment.getPropertySources().contains(PROPERTY_SOURCE_NAME)) {
            return;
        }

        Map<String, Object> properties = propertiesFrom(databaseUrl, environment);
        if (!properties.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
        }
    }

    static Map<String, Object> propertiesFrom(String databaseUrl, ConfigurableEnvironment environment) {
        Map<String, Object> properties = new HashMap<>();
        URI uri = URI.create(databaseUrl);
        if (!hasText(uri.getHost())) {
            return properties;
        }

        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
        if (uri.getPort() > 0) {
            jdbcUrl.append(":").append(uri.getPort());
        }
        jdbcUrl.append(hasText(uri.getPath()) ? uri.getPath() : "/postgres");
        if (hasText(uri.getQuery())) {
            jdbcUrl.append("?").append(uri.getQuery());
        }
        properties.put("spring.datasource.url", jdbcUrl.toString());

        String configuredUsername = environment.getProperty("DATABASE_USERNAME");
        String configuredPassword = environment.getProperty("DATABASE_PASSWORD");
        if (hasText(configuredUsername)) {
            properties.put("spring.datasource.username", configuredUsername);
        }
        if (hasText(configuredPassword)) {
            properties.put("spring.datasource.password", configuredPassword);
        }

        if ((!hasText(configuredUsername) || !hasText(configuredPassword)) && hasText(uri.getUserInfo())) {
            String[] credentials = uri.getUserInfo().split(":", 2);
            if (!hasText(configuredUsername) && credentials.length >= 1) {
                properties.put("spring.datasource.username", decode(credentials[0]));
            }
            if (!hasText(configuredPassword) && credentials.length == 2) {
                properties.put("spring.datasource.password", decode(credentials[1]));
            }
        }

        return properties;
    }

    private static boolean isPostgresUrl(String value) {
        return hasText(value) && (value.startsWith("postgres://") || value.startsWith("postgresql://"));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
