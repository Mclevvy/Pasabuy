import React from "react";

/**
 * Reusable chat thread list.
 * Props:
 *  - items: [{ id, name, avatar, message, time, online, unread }]
 *  - onItemClick: (item) => void
 */
const ChatList = ({ items = [], onItemClick = () => {} }) => {
  return (
    <section className="thread-grid">
      {items.map((chat) => (
        <article
          className="thread-card card"
          key={chat.id}
          onClick={() => onItemClick(chat)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" ? onItemClick(chat) : null)}
        >
          <div className="thread-user">
            <img src={chat.avatar} alt={chat.name} />
            {chat.online && <span className="online-dot" />}
          </div>

          <div className="thread-main">
            <div className="thread-top">
              <h4>{chat.name}</h4>
              <span className="time">{chat.time}</span>
            </div>
            <p className="preview">{chat.message}</p>
          </div>

          {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
        </article>
      ))}
    </section>
  );
};

export default ChatList;
