/**
 * Professional Pipeline 设计系统 —— CareerPulse 视觉规范
 * 取自设计稿 DESIGN.md：以专业蓝 (#0066FF) 为主，成长绿 (#16A34A) 表示已录用，
 * 琥珀色 (#F59E0B) 表示待办，灰白分层 (#F5F5F5 背景 / #FFFFFF 卡片) 营造层次。
 *
 * 设计为浅色优先；为保持视觉一致，dark 主题暂时镜像 light（设计稿仅提供浅色规范）。
 */
/** @type {const} */
const themeColors = {
  primary: { light: '#0066FF', dark: '#0066FF' },
  background: { light: '#F5F5F5', dark: '#F5F5F5' },
  surface: { light: '#FFFFFF', dark: '#FFFFFF' },
  foreground: { light: '#161D21', dark: '#161D21' },
  muted: { light: '#687076', dark: '#687076' },
  border: { light: '#E5E7EB', dark: '#E5E7EB' },
  success: { light: '#16A34A', dark: '#16A34A' },
  warning: { light: '#F59E0B', dark: '#F59E0B' },
  error: { light: '#EF4444', dark: '#EF4444' },
};

module.exports = { themeColors };
