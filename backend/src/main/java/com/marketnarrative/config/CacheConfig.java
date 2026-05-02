package com.marketnarrative.config;

import java.time.Duration;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;

@Configuration
public class CacheConfig implements CachingConfigurer {

    @Bean
    RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer() {
        RedisCacheConfiguration digestCache = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofSeconds(45));
        return builder -> builder.withCacheConfiguration("publicDigest", digestCache);
    }
}
