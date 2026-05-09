import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { messagesAPI, forumAPI } from '../api';
import { useAuth } from '../AuthContext';
import LoadingSkeleton from '../components/LoadingSkeleton';

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), day = Math.floor(diff / 86400000);
  if (m < 1) return '刚刚'; if (m < 60) return `${m}分钟前`;
  if (h < 24) return `${h}小时前`; if (day < 7) return `${day}天前`;
  return new Date(d).toLocaleDateString('zh-CN');
}

const typeLabels = { comment: '评论了你的帖子', reply: '回复了你的评论', like: '赞了你的' };
const typeIcons = { comment: 'fa-comment', reply: 'fa-reply', like: 'fa-heart' };
const NOTIF_SYSTEM_ID = '__system_notifications__';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [convs, setConvs] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [activeOther, setActiveOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const chatRef = useRef(null);

  useEffect(() => {
    loadConvs();
    if (user) loadNotifs();
  }, []);

  // Auto-open conversation from URL param ?to=username
  useEffect(() => {
    const toUser = searchParams.get('to');
    if (toUser && convs.length > 0) {
      const existing = convs.find(c => c.other_name === toUser);
      if (existing) {
        openChat(existing.other_id);
      } else if (toUser !== user?.username) {
        // Start new conversation — find user by name
        const users = JSON.parse(localStorage.getItem('abdl_users') || '{}');
        const targetUser = Object.values(users).find(u => u.username === toUser);
        if (targetUser) {
          openChat(targetUser.id);
        }
      }
    }
  }, [convs, searchParams, user]);

  const loadConvs = async () => {
    try {
      const d = await messagesAPI.conversations();
      setConvs(d.conversations || []);
    } catch {} finally { setLoading(false); }
  };

  const loadNotifs = async () => {
    try {
      const d = await forumAPI.notifications();
      setNotifs(d.notifications || []);
      setUnreadNotifs(d.notifications?.filter(n => !n.is_read).length || 0);
    } catch {}
  };

  const openChat = async (otherId) => {
    if (otherId === NOTIF_SYSTEM_ID) {
      setActiveOther({ id: NOTIF_SYSTEM_ID, username: '系统通知' });
      setMessages(notifs);
      // Mark all as read
      forumAPI.readAllNotifications().then(() => { setUnreadNotifs(0); loadNotifs(); }).catch(() => {});
      return;
    }
    setActiveOther(otherId);
    try {
      const d = await messagesAPI.withUser(otherId);
      setMessages(d.messages || []);
      setActiveOther(d.other);
    } catch {}
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 100);
  };

  const sendMsg = async () => {
    if (!text.trim() || !activeOther || sending || activeOther.id === NOTIF_SYSTEM_ID) return;
    setSending(true);
    try {
      await messagesAPI.send({ receiver_id: activeOther.id, content: text });
      setText('');
      const d = await messagesAPI.withUser(activeOther.id);
      setMessages(d.messages || []);
      loadConvs();
      setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 100);
    } catch {} finally { setSending(false); }
  };

  if (!user) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <h2><i className="fa-solid fa-circle-exclamation" /> 请先登录</h2>
    </div>
  );

  const isNotifChat = activeOther?.id === NOTIF_SYSTEM_ID;

  const getNotifLink = (n) => {
    if (n.type === 'like' && n.target_type === 'post') return `/forum/${n.target_id}`;
    if (n.post_id) return `/forum/${n.post_id}`;
    return '#';
  };

  return (
    <div className="messages-layout" style={{
      display: 'flex', height: 'calc(100vh - 100px)', minHeight: 400,
      borderRadius: 'var(--radius)', overflow: 'hidden',
      boxShadow: 'var(--shadow)', background: 'var(--bg-card)',
    }}>
      {/* Sidebar */}
      <div className="messages-sidebar" style={{ width: 280, minWidth: 240, borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>
            <i className="fa-regular fa-envelope" /> 私信 & 通知
          </h3>
        </div>

        {/* System Notifications Entry */}
        <div onClick={() => openChat(NOTIF_SYSTEM_ID)} style={{
          padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
          background: activeOther?.id === NOTIF_SYSTEM_ID ? 'var(--primary-light)' : 'var(--bg-card)',
          transition: 'background 0.15s',
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
            }}>
              <i className="fa-solid fa-bell" style={{ color: 'var(--primary-dark)' }} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                系统通知
                {unreadNotifs > 0 && <span className="notif-badge" style={{ position: 'static' }}>{unreadNotifs}</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {notifs[0] ? `${notifs[0].from_username} ${typeLabels[notifs[0].type]}` : '暂无通知'}
              </div>
            </div>
          </div>
        </div>

        {/* Conversations */}
        {loading ? <LoadingSkeleton count={3} type="feed" /> : convs.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>暂无对话</p>
        ) : (
          convs.map(c => (
            <div key={c.id} onClick={() => openChat(c.other_id)} style={{
              padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
              background: activeOther?.id === c.other_id ? 'var(--primary-light)' : 'var(--bg-card)',
              transition: 'background 0.15s',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="post-avatar" style={{ width: 40, height: 40 }}>
                  <i className="fa-solid fa-user-astronaut" />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600 }}>{c.other_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.last_message || '开始聊天...'}
                  </div>
                </div>
                {c.unread > 0 && <span className="notif-badge" style={{ position: 'static' }}>{c.unread}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat / Notification area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!activeOther ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.3 }}><i className="fa-regular fa-envelope" /></div>
            <p>选择一个对话开始聊天</p>
          </div>
        ) : isNotifChat ? (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className="fa-solid fa-bell" /> 系统通知</span>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveOther(null)}>
                <i className="fa-solid fa-arrow-left" /> 返回列表
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {notifs.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><i className="fa-solid fa-bell-slash" /></div>
                  <h3>暂无通知</h3>
                </div>
              ) : (
                notifs.map(n => {
                  const link = getNotifLink(n);
                  return (
                    <div key={n.id} style={{
                      padding: '10px 14px', borderRadius: 10, marginBottom: 6,
                      background: n.is_read ? 'transparent' : 'var(--primary-light)',
                      border: `1px solid ${n.is_read ? 'var(--border)' : 'var(--primary)'}`,
                      transition: 'all 0.2s', fontSize: '0.9rem',
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: n.type === 'like' ? 'var(--like-active)' : 'var(--primary-dark)', fontSize: '1rem' }}>
                          <i className={`fa-solid ${typeIcons[n.type] || 'fa-circle'}`} />
                        </span>
                        <div style={{ flex: 1 }}>
                          <strong>{n.from_username}</strong> {typeLabels[n.type]}
                          {n.type === 'like' && (n.target_type === 'post' ? '帖子' : '评论')}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {timeAgo(n.created_at)}
                          </div>
                        </div>
                        {link !== '#' ? (
                          <a href={link} style={{ color: 'var(--link-color)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            查看 <i className="fa-solid fa-arrow-right" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className="fa-regular fa-envelope" /> {activeOther.username}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveOther(null)}>
                <i className="fa-solid fa-arrow-left" /> 返回列表
              </button>
            </div>
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>开始聊天吧</div>
              ) : (
                messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_id === user.id ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%', padding: '10px 14px', borderRadius: 16,
                      background: m.sender_id === user.id ? 'var(--primary)' : 'var(--input-bg)',
                      color: m.sender_id === user.id ? 'white' : 'var(--text)',
                      fontSize: '0.9rem', animation: 'fadeInUp 0.2s ease-out',
                    }}>
                      {m.content}
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 2, textAlign: 'right' }}>
                        {timeAgo(m.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input className="form-control" value={text} onChange={e => setText(e.target.value)}
                placeholder="输入消息..." onKeyDown={e => e.key === 'Enter' && sendMsg()} disabled={sending} />
              <button className="btn btn-primary btn-sm" onClick={sendMsg} disabled={sending || !text.trim()}>
                {sending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
                <span className="hide-mobile"> {sending ? '发送中' : '发送'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
