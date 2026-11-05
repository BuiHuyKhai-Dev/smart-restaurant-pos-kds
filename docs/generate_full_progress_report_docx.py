import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_report_docx():
    doc = Document()

    # Thiết lập lề trang chuẩn A4
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Helper function styling
    def add_main_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
        p.paragraph_format.space_after = Pt(4)

    def add_sub_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        p.paragraph_format.space_after = Pt(14)

    def add_h1(text):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(6)

    def add_h2(text):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(4)

    def add_body_p(text, bold_prefix="", italic=False):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(4)
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = "Times New Roman"
            r_pre.font.size = Pt(11)
            r_pre.font.bold = True
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.italic = italic
        return p

    def format_table(table, col_widths, col_alignments, header_bg="1F4E79"):
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        # Header Row
        hdr_cells = table.rows[0].cells
        for i, cell in enumerate(hdr_cells):
            cell.width = col_widths[i]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            shading = parse_xml(r'<w:shd {} w:fill="{}"/>'.format(nsdecls('w'), header_bg))
            cell._tc.get_or_add_tcPr().append(shading)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                run.font.name = "Times New Roman"
                run.font.size = Pt(10)
                run.font.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

        # Data Rows
        for r_idx in range(1, len(table.rows)):
            row_cells = table.rows[r_idx].cells
            bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, cell in enumerate(row_cells):
                cell.width = col_widths[c_idx]
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                shading = parse_xml(r'<w:shd {} w:fill="{}"/>'.format(nsdecls('w'), bg_color))
                cell._tc.get_or_add_tcPr().append(shading)
                p = cell.paragraphs[0]
                p.alignment = col_alignments[c_idx]
                for run in p.runs:
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(9.5)

        # Border
        for row in table.rows:
            for cell in row.cells:
                tcPr = cell._tc.get_or_add_tcPr()
                borders = parse_xml(
                    r'<w:tcBorders {} >'
                    r'<w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                    r'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                    r'<w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                    r'<w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                    r'</w:tcBorders>'.format(nsdecls('w'))
                )
                tcPr.append(borders)

    # ==========================================
    # TIÊU ĐỀ BÁO CÁO
    # ==========================================
    add_main_title("BÁO CÁO TIẾN ĐỘ THỰC HIỆN ĐỒ ÁN - ĐỢT 2 (TUẦN 09)")
    add_sub_title("BẢN THẢO HIỆN THỰC HÓA HỆ THỐNG & BÁO CÁO KIỂM THỬ SƠ BỘ\nĐỀ TÀI: SMART RESTAURANT POS & KDS")

    add_body_p(" ThS. Trần Đình Nghĩa", "• Giảng viên hướng dẫn:")
    add_body_p(" Hệ Thống Quản Lý Nhà Hàng & Gọi Món Thông Minh (Smart Restaurant POS & KDS)", "• Tên đề tài:")
    add_body_p(" Học kỳ I - Năm học 2026–2027 | Khoa Công Nghệ Thông Tin", "• Học kỳ thực hiện:")

    # ==========================================
    # 1. HÀNH CHÍNH & PHÂN CÔNG LẬP TRÌNH
    # ==========================================
    add_h1("1. Hoàn Thiện Trang Hành Chính & Bảng Phân Công Lập Trình")
    add_body_p("Giai đoạn Lập trình (Tuần 07 đến Tuần 09) được phân chia công việc chi tiết theo đúng năng lực chuyên môn của từng thành viên, đảm bảo tính minh bạch với tổng tỷ lệ đóng góp đạt 100%:")

    headers1 = ["STT", "Họ và Tên", "MSSV", "Vai trò chính", "Nhiệm vụ chi tiết trong giai đoạn Lập trình", "Tỷ lệ (%)"]
    widths1 = [Inches(0.5), Inches(1.3), Inches(0.9), Inches(1.3), Inches(2.2), Inches(0.8)]
    aligns1 = [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER]
    
    data1 = [
        ["1", "Nguyễn Văn A", "20210001", "Lead Backend & CSDL", "Thiết kế & migrate CSDL PostgreSQL/Prisma; Core API NestJS (Auth, Tables, Menu, Orders, Invoices); Logic trừ kho định lượng BOM khóa dòng FOR UPDATE.", "35%"],
        ["2", "Trần Thị B", "20210002", "Lead Frontend & UI/UX", "Xây dựng WebApp PWA khách quét QR (/table/[id]); Màn hình Điều phối bếp KDS (/kds) kèm Urgency Timer; Bàn làm việc POS (/pos), Sơ đồ bàn, Modal VietQR.", "35%"],
        ["3", "Lê Hoàng C", "20210003", "Lead Realtime & DevOps", "Thiết kế Socket.IO Gateway đa phòng (branch, pos, kitchen, table); Tích hợp tài liệu Swagger/OpenAPI; Cấu hình Docker Compose; Triển khai Live Cloud.", "15%"],
        ["4", "Phạm Minh D", "20210004", "Lead QA & Testing", "Thiết kế kịch bản kiểm thử (Test Plan); Viết script kiểm thử E2E liên thông; Thực hiện kiểm thử luồng biên/ngoại lệ; Quản lý Bug Log & Test Report.", "15%"]
    ]

    t1 = doc.add_table(rows=len(data1)+1, cols=6)
    for c_i, h in enumerate(headers1):
        t1.rows[0].cells[c_i].paragraphs[0].add_run(h)
    for r_i, row in enumerate(data1):
        for c_i, val in enumerate(row):
            t1.rows[r_i+1].cells[c_i].paragraphs[0].add_run(val)
    format_table(t1, widths1, aligns1)

    # ==========================================
    # 2. HIỆN THỰC HÓA CƠ SỞ DỮ LIỆU
    # ==========================================
    add_h1("2. Minh Chứng Hiện Thực Hóa Cơ Sở Dữ Liệu Thực Tế")
    add_body_p("Toàn bộ 17 bảng dữ liệu đã được migrate thành công từ bản vẽ ERD lên PostgreSQL Supabase thông qua Prisma ORM, đảm bảo toàn vẹn dữ liệu và ràng buộc khóa ngoại:")

    add_h2("2.1. Danh mục các bảng CSDL đã hiện thực hóa thành công")
    add_body_p("1. branches (Chi nhánh), 2. accounts (Tài khoản nhân viên & quản lý), 3. kitchen_stations (Trạm bếp KDS: Hot, Cold, Bar), 4. tables (Sơ đồ 30 bàn ăn), 5. order_sessions (Phiên gọi món), 6. orders (Đợt gọi món), 7. order_items (Món ăn trong đơn), 8. order_item_modifiers (Topping/Tùy chọn), 9. categories (Danh mục thực đơn), 10. products (Danh mục món ăn), 11. modifier_groups (Nhóm tùy chọn), 12. item_modifiers (Chi tiết tùy chọn), 13. ingredients (18 mặt hàng nguyên liệu kho), 14. inventories (Tồn kho theo chi nhánh), 15. recipes (Công thức định lượng BOM), 16. invoices (Hóa đơn bán lẻ VietQR/Tiền mặt), 17. inventory_audit_logs (Nhật ký kiểm toán trừ kho tự động).")

    add_h2("2.2. Dữ liệu mẫu (Database Seeding) thực tế")
    add_body_p("• Chi nhánh: 3 chi nhánh thực tế tại TP.HCM (Quận 1), Hà Nội (Cầu Giấy) và Đà Nẵng (Hải Châu).")
    add_body_p("• Tài khoản nhân viên: 5 tài khoản mẫu (admin, cashier, kitchen, manager_hanoi, cashier_hanoi), mật khẩu mã hóa Bcrypt 123456.")
    add_body_p("• Bàn ăn: 30 bàn ăn phân bổ tại Tầng Trệt, Tầng 2, Sân Vườn và Phòng VIP.")
    add_body_p("• Nguyên liệu kho BOM: 18 mặt hàng (Mì Ramen tươi, Bánh phở tươi, Nạm bò Úc, Cá hồi Na Uy, Nước dùng hầm xương, Tôm sú, Gạo ST25...) kèm số lượng tồn kho thực tế, giá vốn và ngưỡng an toàn cảnh báo.")

    # ==========================================
    # 3. CORE BACKEND & HỢP ĐỒNG API
    # ==========================================
    add_h1("3. Minh Chứng Tầng Core Backend & Hợp Đồng API")
    add_body_p("• Swagger UI trực quan đang chạy live tại: http://localhost:4000/api/docs với đầy đủ 10 Bộ điều khiển (Controllers).")
    add_body_p("• Các API cốt lõi trả về chuẩn JSON Envelope: { success: true, data: ..., timestamp: ... } kèm mã HTTP tiêu chuẩn (200 OK, 201 Created).")
    add_body_p("• Xử lý ngoại lệ chuẩn hóa (AllExceptionsFilter): Bắt lỗi nghiệp vụ và trả về mã HTTP 400 (Hết hàng tồn kho, bàn đích đang có khách) và 401 (Sai thông tin đăng nhập, token QR bàn không hợp lệ hoặc hết hạn).")

    # ==========================================
    # 4. GIAO DIỆN THẬT & LUỒNG XƯƠNG SỐNG
    # ==========================================
    add_h1("4. Giao Diện Người Dùng Thật & Luồng Nghiệp Vụ Hoàn Chỉnh")
    add_body_p("Ứng dụng Frontend Next.js 14 App Router đang hoạt động hoàn chỉnh với 4 phân hệ màn hình thực tế:")
    add_body_p("1. Khách quét QR gọi món (/table/[id]): Ứng dụng PWA di động, xem menu, chọn topping, theo dõi tiến độ món realtime và nút gọi thanh toán.")
    add_body_p("2. Màn hình Thu ngân POS (/pos): Sơ đồ bàn Floor Plan trực quan, chuông báo thanh toán, in phiếu tạm tính, thanh toán VietQR NAPAS247.")
    add_body_p("3. Màn hình Điều phối Bếp KDS (/kds): Phân trạm bếp (Bếp nóng, Bếp lạnh, Bar), Urgency Timer đếm ngược đổi màu tự động, nút 1 chạm đổi trạng thái.")
    add_body_p("4. Quản trị Admin BOM & Kho (/admin): Giám sát tồn kho thực tế, cảnh báo sắp hết nguyên liệu, cấu hình BOM Recipe, nhập kho nhanh.")

    add_h2("Luồng nghiệp vụ xương sống End-to-End User Story (8 bước khép kín):")
    add_body_p("Bước 1: Khách quét QR định danh bàn ăn -> Bước 2: Khách chọn món & bấm gửi đơn đặt món -> Bước 3: Socket.IO phát sóng đơn mới tới POS và phân luồng vào trạm Bếp KDS chuyên trách -> Bước 4: Đầu bếp bấm nấu xong, Database Transaction khóa dòng FOR UPDATE tự động trừ kho nguyên liệu BOM -> Bước 5: Khách dùng bữa xong bấm Gọi thanh toán -> Bước 6: Thu ngân lập phiếu tạm tính có chiết khấu và VAT -> Bước 7: Khách chuyển khoản VietQR chuẩn NAPAS247 -> Bước 8: Thu ngân chốt hóa đơn, giải phóng bàn về trống và xoay vòng thu hồi mã QR cũ.")

    # ==========================================
    # 5. KẾT QUẢ KIỂM THỬ SƠ BỘ (TEST REPORT)
    # ==========================================
    add_h1("5. Bảng Kết Quả Kiểm Thử Chức Năng Sơ Bộ (Test Report)")
    add_body_p("Thực thi kịch bản kiểm thử E2E liên thông thực tế (test_e2e_integration.js, test_multi_round_orders.js) đạt tỷ lệ 100% PASS:")

    headers5 = ["Mã TC", "Phân hệ", "Tên ca kiểm thử", "Loại", "Kết quả kỳ vọng", "Trạng thái"]
    widths5 = [Inches(0.6), Inches(1.1), Inches(1.9), Inches(1.0), Inches(1.9), Inches(0.7)]
    aligns5 = [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER]
    
    data5 = [
        ["TC01", "Xác thực", "Đăng nhập tài khoản Thu ngân hợp lệ", "Happy Path", "Cấp phát JWT token chứa role CASHIER và branchId.", "PASS"],
        ["TC02", "Xác thực", "Đăng nhập sai mật khẩu", "Ngoại lệ", "Trả về HTTP 401 Unauthorized kèm thông báo lỗi rõ ràng.", "PASS"],
        ["TC03", "Bảo mật bàn", "Cấp phát và xoay vòng mã QR bàn", "Happy Path", "Sinh token HMAC mới, vô hiệu hóa token cũ trong CSDL.", "PASS"],
        ["TC04", "Bảo mật bàn", "Khách quét QR hợp lệ vào bàn", "Happy Path", "Xác thực đúng số bàn, khu vực và mở đúng thực đơn.", "PASS"],
        ["TC05", "Bảo mật bàn", "Khách quét mã QR giả mạo / hết hạn", "Ngoại lệ", "Trả về HTTP 401 Unauthorized, từ chối quyền gọi món.", "PASS"],
        ["TC06", "Đặt món", "Khách gửi đơn đặt món thành công", "Happy Path", "Tạo OrderCode, bàn chuyển sang trạng thái OCCUPIED.", "PASS"],
        ["TC07", "Đặt món", "Thu ngân POS gọi món nhưng quên chọn bàn", "Luồng biên", "Trả về HTTP 401 yêu cầu chọn bàn tại quầy.", "PASS"],
        ["TC08", "Realtime", "Bắn WebSocket đơn mới về POS và KDS", "Happy Path", "POS nhận order:placed, Bếp nhận đúng món theo trạm.", "PASS"],
        ["TC09", "KDS & BOM", "Bếp nấu xong & tự động trừ kho BOM", "Happy Path", "Trừ kho chính xác từng gram theo công thức BOM, ghi audit log.", "PASS"],
        ["TC10", "BOM Kho", "Nấu món khi kho nguyên liệu bị thiếu", "Ngoại lệ", "Trả về HTTP 400 Bad Request, rollback transaction an toàn.", "PASS"],
        ["TC11", "Đặt món", "Gọi món nhiều đợt cộng dồn (Multi-round)", "Happy Path", "Các đợt gọi món cùng thuộc 1 session, tiền cộng dồn chuẩn xác.", "PASS"],
        ["TC12", "Thao tác bàn", "Đổi bàn sang bàn đang có khách ngồi", "Ngoại lệ", "Trả về HTTP 400 báo lỗi bàn đích không trống.", "PASS"],
        ["TC13", "Hóa đơn", "In phiếu tạm tính có giảm giá và thuế", "Happy Path", "Tính chính xác tiền món, chiết khấu, VAT và tổng cộng.", "PASS"],
        ["TC14", "Thanh toán", "Chốt hóa đơn VietQR & giải phóng bàn", "Happy Path", "Đóng phiên ăn, bàn về AVAILABLE, thu hồi mã QR cũ.", "PASS"]
    ]

    t5 = doc.add_table(rows=len(data5)+1, cols=6)
    for c_i, h in enumerate(headers5):
        t5.rows[0].cells[c_i].paragraphs[0].add_run(h)
    for r_i, row in enumerate(data5):
        for c_i, val in enumerate(row):
            t5.rows[r_i+1].cells[c_i].paragraphs[0].add_run(val)
    format_table(t5, widths5, aligns5)

    # ==========================================
    # 6. FEATURE FREEZE & BUG LOG
    # ==========================================
    add_h1("6. Kế Hoạch Đóng Băng Tính Năng & Danh Sách Lỗi Tồn Đọng")
    add_body_p("• Quy chế Feature Freeze: Kể từ Tuần 09, hệ thống chính thức đóng băng tính năng, tập trung toàn lực sửa lỗi tồn đọng, tối ưu hiệu năng và đóng gói triển khai Cloud.")
    add_body_p("• Danh sách lỗi tồn đọng (Bug Log): Đã giải quyết triệt để 4 lỗi gồm BUG-01 (xử lý concurrency khi khách đặt món trùng lúc), BUG-02 (chính sách Autoplay âm thanh chuông KDS trên Chrome), BUG-03 (tự động reconnect và làm mới sơ đồ bàn POS), BUG-04 (responsive khổ giấy in nhiệt K80).")

    # ==========================================
    # PHẦN II: 4 KÊNH NGHIỆM THU
    # ==========================================
    add_h1("PHẦN II: 4 Kênh Nghiệm Thu & Bàn Giao Sản Phẩm Cho Giảng Viên")
    add_body_p("1. Kênh 1 - GitHub Repository: Repo Public, đã cấp quyền Reviewer cho Giảng viên trandinhnghia, lịch sử commit minh bạch đều đặn theo từng tuần, file README.md hoàn chỉnh.")
    add_body_p("2. Kênh 2 - Docker Compose: Khởi chạy toàn bộ hạ tầng bằng đúng 01 câu lệnh duy nhất: docker compose up -d.")
    add_body_p("3. Kênh 3 - Live Cloud Deployment: Frontend triển khai trên Vercel, Backend trên Railway, Database trên Supabase Managed Cluster.")
    add_body_p("4. Kênh 4 - Kịch bản Demo: Live Demo Session (3–5 phút) phân định rõ 1 thành viên thao tác và 1 thành viên thuyết minh luồng dữ liệu; kèm Video Demo dự phòng (2–3 phút) đăng tải chế độ Unlisted trên YouTube/Google Drive.")

    doc.save("docs/BAO_CAO_TIEN_DO_LAN_2_TUAN_09.docx")
    print("Document created successfully at docs/BAO_CAO_TIEN_DO_LAN_2_TUAN_09.docx")

if __name__ == "__main__":
    create_report_docx()
