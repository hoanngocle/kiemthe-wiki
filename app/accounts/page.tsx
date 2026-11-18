"use client";

import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AdminShell } from "@/app/components/admin-shell";
import type { Account, AccountList } from "@/lib/accounts";
import type { Character } from "@/lib/topup-types";

function CharacterNames({ characters }: { characters: Character[] }) {
  return characters.length ? <ul className="account-characters">{characters.map((character) => <li key={character.id}>{character.name}</li>)}</ul> : <span className="account-no-characters">Chưa có nhân vật</span>;
}

export default function AccountsPage() {
  const [data, setData] = useState<AccountList | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [passwordTarget, setPasswordTarget] = useState<Account | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordDialog = useRef<HTMLDialogElement>(null);
  const usernameInput = useRef<HTMLInputElement>(null);
  const busy = submitting || deletingId !== null || passwordSaving;

  const refresh = useCallback((signal?: AbortSignal) => {
    return fetch("/api/accounts", { cache: "no-store", signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tải được danh sách tài khoản.");
      if (signal?.aborted) return;
      setData(result as AccountList);
      setListError(null);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!signal?.aborted) {
        setListError(error instanceof Error ? error.message : "Không kết nối được với trang quản trị.");
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setFormError(null);
    setSuccess(null);
    if (values.get("password") !== values.get("confirmPassword")) {
      setFormError("Mật khẩu nhập lại chưa khớp.");
      form.querySelector<HTMLInputElement>("[name=confirmPassword]")?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(values)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không đăng ký được tài khoản.");
      const account = result.account as Account;
      setSuccess(`Đã tạo tài khoản ${account.username}.`);
      setData((current) => current ? { ...current, accounts: [account, ...current.accounts.filter((item) => item.id !== account.id)].slice(0, 200), total: current.total + 1 } : { accounts: [account], total: 1, characterAccounts: [], characterError: null });
      form.reset();
      usernameInput.current?.focus();
      setLoading(true);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không kết nối được với trang quản trị.");
    } finally { setSubmitting(false); }
  }

  async function remove(account: Account) {
    if (busy) return;
    setDeletingId(account.id);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await fetch("/api/accounts", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không xóa được tài khoản.");
      setData((current) => current ? { ...current, accounts: current.accounts.filter((item) => item.id !== account.id), total: Math.max(0, current.total - 1) } : current);
      setActionSuccess(`Đã xóa tài khoản ${account.username}.`);
      setLoading(true);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không kết nối được với trang quản trị.");
    } finally { setDeletingId(null); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !passwordTarget) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setPasswordError(null);
    if (values.get("password") !== values.get("confirmPassword")) {
      setPasswordError("Mật khẩu nhập lại chưa khớp.");
      form.querySelector<HTMLInputElement>("[name=confirmPassword]")?.focus();
      return;
    }
    setPasswordSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await fetch("/api/accounts", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: passwordTarget.id, ...Object.fromEntries(values) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không đổi được mật khẩu.");
      setActionSuccess(`Đã đổi mật khẩu tài khoản ${passwordTarget.username}.`);
      passwordDialog.current?.close();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Không kết nối được với trang quản trị.");
    } finally { setPasswordSaving(false); }
  }

  const charactersByAccount = new Map((data?.characterAccounts ?? []).map((group) => [group.account.trim().toLowerCase(), group.characters]));
  const orphanedAccounts = (data?.characterAccounts ?? []).filter((group) => !group.registered);

  return <AdminShell section="accounts" connected={!!data && !listError}>
    <div className="page-content accounts-page">
      <div className="accounts-heading"><h1>Tài khoản</h1></div>
      <div className="accounts-workspace">
      <section className="account-panel account-list-panel" aria-labelledby="accounts-title" aria-busy={loading}>
        <div className="section-heading"><h2 id="accounts-title">Danh sách tài khoản <span>{data?.total ?? "—"}</span></h2><button className="secondary-button" disabled={loading || busy} onClick={() => { setLoading(true); void refresh(); }}>{loading ? <ArrowPathIcon className="ui-icon spinner" aria-hidden="true" /> : <ArrowPathIcon className="ui-icon" aria-hidden="true" />} Làm mới</button></div>
        {listError && <div className="error-banner account-list-error" role="alert">{listError}{data && <span>Danh sách bên dưới chưa được cập nhật. Bấm Làm mới để thử lại.</span>}</div>}
        {actionError && <div className="error-banner account-list-error" role="alert">{actionError}</div>}
        {actionSuccess && <div className="account-success account-list-message" role="status">{actionSuccess}</div>}
        {data?.characterError && <div className="error-banner account-list-error" role="alert">{data.characterError}</div>}
        {loading && !data ? <div className="account-empty" role="status"><ArrowPathIcon className="ui-icon spinner" aria-hidden="true" />Đang tải…</div> : !data ? <div className="account-empty">Chưa tải được danh sách.</div> : data.accounts.length === 0 ? <div className="account-empty">Chưa có tài khoản.</div> : <div className="account-table-wrap"><table className="account-table"><thead><tr><th scope="col">ID</th><th scope="col">Tên tài khoản</th><th scope="col">Nhân vật</th><th scope="col">Trạng thái</th><th scope="col">Ngày đăng ký</th><th scope="col" className="account-action-cell">Thao tác</th></tr></thead><tbody>{data.accounts.map((account) => <tr key={account.id}><td className="account-id">{String(account.id).padStart(2, "0")}</td><td><strong>{account.username}</strong></td><td>{data.characterError ? <span className="account-no-characters">Chưa tải được</span> : <CharacterNames characters={charactersByAccount.get(account.username.trim().toLowerCase()) ?? []}/>}</td><td><span className={`status ${account.locked ? "status-error" : "status-running"}`}><span className="tiny-dot"/>{account.locked ? "Đã khóa" : "Hoạt động"}</span></td><td className="account-date">{account.createdAt ?? "—"}</td><td className="account-action-cell"><div className="account-row-actions"><button type="button" className="row-button account-password-button" disabled={busy || loading} aria-label={`Đổi mật khẩu tài khoản ${account.username}`} onClick={() => { setPasswordTarget(account); setPasswordError(null); passwordDialog.current?.querySelector("form")?.reset(); passwordDialog.current?.showModal(); }}>Đổi mật khẩu</button><button type="button" className="row-button account-delete-button" disabled={busy || loading} aria-label={`Xóa tài khoản ${account.username}`} onClick={() => { setDeleteTarget(account); deleteDialog.current?.showModal(); }}>{deletingId === account.id ? <ArrowPathIcon className="ui-icon spinner" aria-hidden="true" /> : <TrashIcon className="ui-icon ui-icon-sm" aria-hidden="true" />}{deletingId === account.id ? "Đang xóa…" : "Xóa"}</button></div></td></tr>)}</tbody></table></div>}
        {data && data.total > 200 && <div className="list-footer">Hiển thị 200 / {data.total} tài khoản.</div>}
      </section>
      <section className="account-panel account-register-panel" aria-labelledby="register-title">
        <div className="section-heading"><h2 id="register-title">Đăng ký tài khoản</h2></div>
        <form className="account-form" onSubmit={(event) => void register(event)} aria-busy={submitting}>
          <div className="account-fields">
            <div className="account-field"><label htmlFor="account-username">Tên tài khoản</label><input ref={usernameInput} id="account-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Tên đăng nhập" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_]{3,32}" title="3–32 ký tự: chữ không dấu, số hoặc dấu gạch dưới" readOnly={busy}/></div>
            <div className="account-field"><label htmlFor="account-password">Mật khẩu</label><input id="account-password" name="password" type="password" autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" required minLength={6} maxLength={32} pattern="[\x20-\x7E]{6,32}" title="6–32 ký tự không dấu" readOnly={busy}/></div>
            <div className="account-field"><label htmlFor="account-confirm">Xác nhận mật khẩu</label><input id="account-confirm" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" required minLength={6} maxLength={32} readOnly={busy}/></div>
          </div>
          {formError && <div className="error-banner account-message" role="alert">{formError}</div>}
          {success && <div className="account-success account-message" role="status">{success}</div>}
          <button type="submit" className="launch-button account-submit" disabled={busy}>{submitting && <ArrowPathIcon className="ui-icon spinner" aria-hidden="true" />}{submitting ? "Đang đăng ký…" : "Đăng ký"}</button>
        </form>
      </section>
      </div>
      {orphanedAccounts.length > 0 && <section className="account-panel account-character-panel" aria-labelledby="character-accounts-title">
        <div className="section-heading"><h2 id="character-accounts-title">Tài khoản từ dữ liệu nhân vật <span>{orphanedAccounts.length}</span></h2></div>
        <div className="account-table-wrap"><table className="account-table"><thead><tr><th scope="col">Tên tài khoản</th><th scope="col">Nhân vật</th><th scope="col">Trạng thái</th></tr></thead><tbody>{orphanedAccounts.map((group) => <tr key={group.account}><td><strong>{group.account}</strong></td><td><CharacterNames characters={group.characters}/></td><td><span className="account-missing-login">Chưa có bản ghi đăng nhập</span></td></tr>)}</tbody></table></div>
      </section>}
      <dialog ref={passwordDialog} className="account-delete-dialog account-password-dialog" aria-labelledby="account-password-title" aria-describedby="account-password-target" onCancel={(event) => { if (passwordSaving) event.preventDefault(); }} onClose={() => { setPasswordTarget(null); setPasswordError(null); passwordDialog.current?.querySelector("form")?.reset(); }}>
        <h2 id="account-password-title">Đổi mật khẩu</h2>
        <p id="account-password-target"><strong>{passwordTarget?.username}</strong></p>
        <form onSubmit={(event) => void changePassword(event)} aria-busy={passwordSaving}>
          <div className="account-fields">
            <div className="account-field"><label htmlFor="change-password">Mật khẩu mới</label><input id="change-password" name="password" type="password" autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" required minLength={6} maxLength={32} pattern="[\x20-\x7E]{6,32}" title="6–32 ký tự không dấu" autoFocus readOnly={passwordSaving}/></div>
            <div className="account-field"><label htmlFor="change-password-confirm">Xác nhận mật khẩu mới</label><input id="change-password-confirm" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" required minLength={6} maxLength={32} readOnly={passwordSaving}/></div>
          </div>
          {passwordError && <div className="error-banner account-message" role="alert">{passwordError}</div>}
          <div className="account-dialog-actions"><button type="button" className="secondary-button" disabled={passwordSaving} onClick={() => passwordDialog.current?.close()}>Hủy</button><button type="submit" className="launch-button" disabled={passwordSaving}>{passwordSaving && <ArrowPathIcon className="ui-icon spinner" aria-hidden="true" />}{passwordSaving ? "Đang lưu…" : "Lưu mật khẩu"}</button></div>
        </form>
      </dialog>
      <dialog ref={deleteDialog} className="account-delete-dialog" aria-labelledby="account-delete-title" aria-describedby="account-delete-description" onClose={() => setDeleteTarget(null)}>
        <h2 id="account-delete-title">Xóa tài khoản?</h2>
        <p id="account-delete-description">Tài khoản <strong>{deleteTarget?.username}</strong> sẽ bị xóa. Không thể hoàn tác.</p>
        <div className="account-dialog-actions"><button type="button" className="secondary-button" autoFocus onClick={() => deleteDialog.current?.close()}>Hủy</button><button type="button" className="row-button account-delete-button" onClick={() => { if (deleteTarget) { const account = deleteTarget; deleteDialog.current?.close(); void remove(account); } }}>Xóa tài khoản</button></div>
      </dialog>
    </div>
  </AdminShell>;
}
