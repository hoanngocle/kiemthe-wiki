"use client";

export default function ShopWikiError({ reset }: { reset: () => void }) {
  return <div className="page-content"><h1>Chưa đọc được dữ liệu cửa hàng</h1><p>Kiểm tra các file cấu hình quầy hàng và vật phẩm trong Server/gameserver, sau đó tải lại.</p><button onClick={reset}>Thử lại</button></div>;
}
