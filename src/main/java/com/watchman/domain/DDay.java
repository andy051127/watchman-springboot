package com.watchman.domain;

import java.time.LocalDate;

public class DDay {
	private Long ddayId;
	private Long userId;
	private String name;
	private LocalDate ddayDate;

	public DDay() {
	}

	public Long getDdayId() {return ddayId;}
	public void setDdayId(Long ddayId) {this.ddayId = ddayId;}
	public Long getUserId() {return userId;}
	public void setUserId(Long userId) {this.userId = userId;}
	public String getName() {return name;}
	public void setName(String name) {this.name = name;}
	public LocalDate getDdayDate() {return ddayDate;}
	public void setDdayDate(LocalDate ddayDate) {this.ddayDate = ddayDate;}

}
