package com.watchman.domain;

import java.time.LocalDate;
import java.time.LocalTime;

public class TimetableBlock {
	private Long blockId;
	private Long userId;
	private LocalDate blockDate;
	private LocalTime startTime;
	private LocalTime endTime;
	private String color;
	private String label;

	public TimetableBlock() {
	}

	public Long getBlockId() {return blockId;}
	public void setBlockId(Long blockId) {this.blockId = blockId;}
	public Long getUserId() {return userId;}
	public void setUserId(Long userId) {this.userId = userId;}
	public LocalDate getBlockDate() {return blockDate;}
	public void setBlockDate(LocalDate blockDate) {this.blockDate = blockDate;}
	public LocalTime getStartTime() {return startTime;}
	public void setStartTime(LocalTime startTime) {this.startTime = startTime;}
	public LocalTime getEndTime() {return endTime;}
	public void setEndTime(LocalTime endTime) {this.endTime = endTime;}
	public String getColor() {return color;}
	public void setColor(String color) {this.color = color;}
	public String getLabel() {return label;}
	public void setLabel(String label) {this.label = label;}

}
