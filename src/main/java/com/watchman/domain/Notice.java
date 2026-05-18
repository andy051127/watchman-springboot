package com.watchman.domain;

import java.time.LocalDateTime;

public class Notice {
    private Long noticeId;
    private String tag;
    private String title;
    private String content;
    private boolean pinned;
    private String writerNickname;
    private LocalDateTime createdAt;

    public Notice() {}

    public Long getNoticeId() { return noticeId; }
    public void setNoticeId(Long noticeId) { this.noticeId = noticeId; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isPinned() { return pinned; }
    public void setPinned(boolean pinned) { this.pinned = pinned; }
    public String getWriterNickname() { return writerNickname; }
    public void setWriterNickname(String writerNickname) { this.writerNickname = writerNickname; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
