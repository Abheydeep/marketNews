package com.marketnarrative.publishing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class PublicDigestCachePublisher {

    private static final String LATEST_DIGESTS_KEY = "public:digest:latest";
    private static final Duration DIGEST_TTL = Duration.ofMinutes(30);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public PublicDigestCachePublisher(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(LocalDate digestDate, PublicDigestDto digest) {
        try {
            String json = objectMapper.writeValueAsString(digest);
            String dailyKey = "public:digest:" + digestDate;
            redisTemplate.opsForValue().set(dailyKey, json, DIGEST_TTL);
            redisTemplate.opsForZSet().add(LATEST_DIGESTS_KEY, dailyKey, digestDate.toEpochDay());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize public digest for Redis", ex);
        }
    }
}
