package com.watchman.domain;

import java.time.LocalDate;

public class Timetable {
	private Long timetableId;
	private Long userId;
	private LocalDate tableDate;
	private int hourSlot;
	private String content;

	public Timetable() {
	}

	public Long getTimetableId() {return timetableId;}
	public void setTimetableId(Long timetableId) {this.timetableId = timetableId;}
	public Long getUserId() {return userId;}
	public void setUserId(Long userId) {this.userId = userId;}
	public LocalDate getTableDate() {return tableDate;}
	public void setTableDate(LocalDate tableDate) {this.tableDate = tableDate;}
	public int getHourSlot() {return hourSlot;}
	public void setHourSlot(int hourSlot) {this.hourSlot = hourSlot;}
	public String getContent() {return content;}
	public void setContent(String content) {this.content = content;}

}
