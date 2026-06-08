package com.watchman.controller;

import com.watchman.repository.AchievementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class StudyRoomController {

    private SimpMessagingTemplate messagingTemplate;
    private AchievementRepository achievementRepository;

    @Autowired
    public void setMessagingTemplate(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Autowired
    public void setAchievementRepository(AchievementRepository achievementRepository) {
        this.achievementRepository = achievementRepository;
    }

    // 입장 / 퇴장 브로드캐스트
    @MessageMapping("/room/{groupId}/join")
    public void handleJoin(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        Map<String, Object> out = new java.util.HashMap<>(payload);
        out.put("action", "join");
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/presence", out);
    }

    @MessageMapping("/room/{groupId}/leave")
    public void handleLeave(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        Map<String, Object> out = new java.util.HashMap<>(payload);
        out.put("action", "leave");
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/presence", out);
    }

    // 집중/딴짓 상태 브로드캐스트
    @MessageMapping("/room/{groupId}/focus")
    public void handleFocus(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/focus", payload);
    }

    // 채팅 메시지 브로드캐스트 + 채팅 카운트 증가
    @MessageMapping("/room/{groupId}/chat")
    public void handleChat(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/chat", payload);
        Object userIdObj = payload.get("userId");
        if (userIdObj != null) {
            try {
                Long userId = ((Number) userIdObj).longValue();
                achievementRepository.incrementChatCount(userId);
            } catch (Exception ignored) {}
        }
    }

    // WebRTC 시그널링 브로드캐스트
    @MessageMapping("/room/{groupId}/signal")
    public void handleSignal(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/signal", payload);
    }
}
