package com.watchman.domain;

import java.time.LocalDate;

public class TimetableBlock {
    private Long blockId;
    private Long userId;
    private LocalDate blockDate;
    private int startMin;
    private int endMin;
    private String color;
    private String content;

    public TimetableBlock() {}

    public Long getBlockId() { return blockId; }
    public void setBlockId(Long blockId) { this.blockId = blockId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public LocalDate getBlockDate() { return blockDate; }
    public void setBlockDate(LocalDate blockDate) { this.blockDate = blockDate; }
    public int getStartMin() { return startMin; }
    public void setStartMin(int startMin) { this.startMin = startMin; }
    public int getEndMin() { return endMin; }
    public void setEndMin(int endMin) { this.endMin = endMin; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
