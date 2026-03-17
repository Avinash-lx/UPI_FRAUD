package com.frauddetect.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;
import reactor.core.publisher.Flux;

import java.util.Map;

@Configuration
public class WebSocketConfig {

    @Bean
    public HandlerMapping webSocketHandlerMapping() {
        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setOrder(10);
        mapping.setUrlMap(Map.of("/ws/fraud-stream", fraudStreamHandler()));
        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter();
    }

    @Bean
    public WebSocketHandler fraudStreamHandler() {
        Flux<ScoreResponse> sharedStream = TransactionScoringService.fraudStream.asFlux().share();

        return session -> {
            Flux<org.springframework.web.reactive.socket.WebSocketMessage> messages = sharedStream
                    .map(response -> {
                        try {
                            String json = new com.fasterxml.jackson.databind.ObjectMapper()
                                    .writeValueAsString(response);
                            return session.textMessage(json);
                        } catch (Exception e) {
                            return session.textMessage("{\"error\":\"serialization error\"}");
                        }
                    });
            return session.send(messages);
        };
    }
}
