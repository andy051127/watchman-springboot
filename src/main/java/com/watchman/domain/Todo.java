package com.watchman.domain;

import java.time.LocalDate;

public class Todo {
	private Long todoId;
	private Long userId;
	private LocalDate todoDate;
	private String content;
	private boolean done;

	public Todo() {
	}

	public Long getTodoId() {return todoId;}
	public void setTodoId(Long todoId) {this.todoId = todoId;}
	public Long getUserId() {return userId;}
	public void setUserId(Long userId) {this.userId = userId;}
	public LocalDate getTodoDate() {return todoDate;}
	public void setTodoDate(LocalDate todoDate) {this.todoDate = todoDate;}
	public String getContent() {return content;}
	public void setContent(String content) {this.content = content;}
	public boolean isDone() {return done;}
	public void setDone(boolean done) {this.done = done;}

}
