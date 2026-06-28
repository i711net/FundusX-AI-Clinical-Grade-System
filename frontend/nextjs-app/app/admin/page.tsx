"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database, Download, Eye, FileText, ImagePlus, KeyRound, Loader2, LogOut, Plus, RefreshCw, Save, Trash2, UploadCloud, X } from "lucide-react";
import { LanguageToggle } from "../components/LanguageToggle";
import { AiReport, FundusImage, Quiz, SubscriptionAccount, isSupabaseConfigured, supabase } from "../lib/supabase";

type AdminTab = "images" | "quizzes" | "reports" | "access" | "settings";

const tabs: Array<{ id: AdminTab; zh: string; en: string }> = [
  { id: "images", zh: "图片管理", en: "Images" },
  { id: "quizzes", zh: "考试管理", en: "Quizzes" },
  { id: "reports", zh: "报告浏览", en: "Reports" },
  { id: "access", zh: "订阅访问", en: "Access" },
  { id: "settings", zh: "连接设置", en: "Settings" },
];

const gradeLabels = ["无DR / No DR", "轻度 / Mild", "中度 / Moderate", "重度 / Severe", "增殖期 / Proliferative"];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("images");
  const [images, setImages] = useState<FundusImage[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionAccount[]>([]);
  const [newSubscriptionCode, setNewSubscriptionCode] = useState("");
  const [imageTotal, setImageTotal] = useState(0);
  const [imagePage, setImagePage] = useState(0);
  const [imagePageSize, setImagePageSize] = useState(50);
  const [imageSearch, setImageSearch] = useState("");
  const [imageTypeFilter, setImageTypeFilter] = useState("");
  const [imageGradeFilter, setImageGradeFilter] = useState("");
  const [imageStatusFilter, setImageStatusFilter] = useState("");
  const [reportTotal, setReportTotal] = useState(0);
  const [reportPage, setReportPage] = useState(0);
  const [reportPageSize, setReportPageSize] = useState(50);
  const [reportSearch, setReportSearch] = useState("");
  const [reportRiskFilter, setReportRiskFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewReport, setPreviewReport] = useState<AiReport | null>(null);
  const [previewImage, setPreviewImage] = useState<FundusImage | null>(null);

  const stats = useMemo(
    () => [
      { label: "眼底图片 / Images", value: imageTotal || images.length, icon: ImagePlus },
      { label: "考试 / Quizzes", value: quizzes.length, icon: Database },
      { label: "AI报告 / Reports", value: reportTotal || reports.length, icon: FileText },
      { label: "订阅用户 / Users", value: subscriptions.length, icon: KeyRound },
    ],
    [imageTotal, images.length, quizzes.length, reportTotal, reports.length, subscriptions.length]
  );

  async function loadImages(page = imagePage) {
    const from = page * imagePageSize;
    const to = from + imagePageSize - 1;
    let query = supabase
      .from("fundus_images")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    const search = imageSearch.trim();
    if (search) {
      const safeSearch = search.replace(/[%(),]/g, "");
      query = query.or(`image_code.ilike.%${safeSearch}%,title.ilike.%${safeSearch}%,diagnosis_label.ilike.%${safeSearch}%`);
    }
    if (imageTypeFilter) query = query.eq("image_type", imageTypeFilter);
    if (imageGradeFilter !== "") query = query.eq("disease_grade", Number(imageGradeFilter));
    if (imageStatusFilter === "active") query = query.eq("is_active", true);
    if (imageStatusFilter === "inactive") query = query.eq("is_active", false);

    const { data, error, count } = await query;
    if (error) throw error;
    setImages((data || []) as FundusImage[]);
    setImageTotal(count || 0);
  }

  async function loadAll() {
    if (!isSupabaseConfigured) {
      setMessage("请先在 Vercel 环境变量中配置 Supabase。");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await loadImages();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片加载失败");
      setLoading(false);
      return;
    }
    const [quizResult, accessResult] = await Promise.all([
      supabase.from("quizzes").select("*").order("created_at", { ascending: false }).limit(50),
      fetch("/api/admin/subscriptions").then((response) => response.json()),
    ]);

    try {
      await loadReports();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "报告加载失败");
    }

    if (quizResult.error || accessResult.error) {
      setMessage(quizResult.error?.message || accessResult.error || "加载失败");
    } else {
      setQuizzes((quizResult.data || []) as Quiz[]);
      setSubscriptions((accessResult.subscriptions || []) as SubscriptionAccount[]);
    }
    setLoading(false);
  }

  async function applyImageFilters() {
    setImagePage(0);
    setLoading(true);
    setMessage("");
    try {
      await loadImages(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function goToImagePage(nextPage: number) {
    if (nextPage < 0) return;
    if (nextPage * imagePageSize >= imageTotal && imageTotal > 0) return;
    setImagePage(nextPage);
    setLoading(true);
    setMessage("");
    try {
      await loadImages(nextPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadReports(page = reportPage) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(reportPageSize),
    });
    if (reportSearch.trim()) params.set("search", reportSearch.trim());
    if (reportRiskFilter) params.set("risk", reportRiskFilter);

    const response = await fetch(`/api/admin/reports?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "报告加载失败");
    setReports((data.reports || []) as AiReport[]);
    setReportTotal(Number(data.count || 0));
  }

  async function applyReportFilters() {
    setReportPage(0);
    setLoading(true);
    setMessage("");
    try {
      await loadReports(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "报告加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function goToReportPage(nextPage: number) {
    if (nextPage < 0) return;
    if (nextPage * reportPageSize >= reportTotal && reportTotal > 0) return;
    setReportPage(nextPage);
    setLoading(true);
    setMessage("");
    try {
      await loadReports(nextPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "报告加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleImageUpload(formData: FormData) {
    setUploading(true);
    setMessage("");

    try {
      const uploadResponse = await fetch("/api/admin/upload-r2", {
        method: "POST",
        body: formData,
      });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadResult.error || "R2上传失败");
      if (!uploadResult.url) throw new Error("R2_PUBLIC_BASE_URL 未配置，无法生成图片公开访问地址。");

      const imageCode =
        String(formData.get("image_code") || "").trim() ||
        `FUNDUS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const insertResult = await supabase.from("fundus_images").insert({
        image_url: uploadResult.url,
        storage_key: uploadResult.key,
        image_code: imageCode,
        image_type: formData.get("image_type"),
        title: formData.get("title"),
        diagnosis_label: formData.get("diagnosis_label"),
        disease_grade: Number(formData.get("disease_grade")),
        is_active: true,
      });

      if (insertResult.error) throw insertResult.error;
      setMessage("图片已上传到 R2，并写入 Supabase。");
      await loadImages(0);
      setImagePage(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function disableImage(image: FundusImage) {
    if (!window.confirm(`停用这张图片？\n${image.image_code || image.title || image.id}`)) return;
    setMessage("");
    const { error } = await supabase.from("fundus_images").update({ is_active: false }).eq("id", image.id);
    if (error) setMessage(error.message);
    else {
      setMessage("图片已停用。");
      await loadImages();
    }
  }

  async function deleteImage(image: FundusImage) {
    if (!window.confirm(`彻底删除这张图片记录和R2文件？\n${image.image_code || image.title || image.id}`)) return;
    setMessage("");

    try {
      if (image.storage_key) {
        const response = await fetch("/api/admin/upload-r2", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: image.storage_key }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "R2删除失败");
      }

      const { error } = await supabase.from("fundus_images").delete().eq("id", image.id);
      if (error) throw error;

      setMessage("图片和数据库记录已删除。");
      await loadImages();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    }
  }

  async function updateImageMetadata(image: FundusImage, formData: FormData) {
    setMessage("");
    const diseaseGradeValue = String(formData.get("disease_grade") || "");
    const payload = {
      image_code: String(formData.get("image_code") || "").trim() || null,
      title: String(formData.get("title") || "").trim() || null,
      image_type: String(formData.get("image_type") || "quiz"),
      diagnosis_label: String(formData.get("diagnosis_label") || "").trim() || null,
      disease_grade: diseaseGradeValue === "" ? null : Number(diseaseGradeValue),
      is_active: String(formData.get("is_active")) === "true",
    };

    const { error } = await supabase.from("fundus_images").update(payload).eq("id", image.id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("图片信息已保存。");
    await loadImages();
  }

  async function createQuiz(formData: FormData) {
    setMessage("");
    const title = String(formData.get("title") || "");
    const description = String(formData.get("description") || "");
    const { error } = await supabase.from("quizzes").insert({ title, description, is_active: true });
    if (error) setMessage(error.message);
    else {
      setMessage("考试已创建。后续可在 quiz_items 表中绑定100张图片。");
      await loadAll();
    }
  }

  async function createSubscription(formData: FormData) {
    setMessage("");
    setNewSubscriptionCode("");
    const payload = {
      label: String(formData.get("label") || "月度订阅 / Monthly access"),
      username: String(formData.get("username") || "").trim(),
      days: Number(formData.get("days") || 30),
      maxUses: String(formData.get("max_uses") || "") || null,
      code: String(formData.get("code") || ""),
    };

    const response = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "创建订阅用户失败");
      return;
    }

    setNewSubscriptionCode(result.code);
    setMessage("订阅用户已创建。请复制访问码给用户；系统只显示这一次明文。");
    await loadAll();
  }

  async function setAccessActive(code: SubscriptionAccount, isActive: boolean) {
    const response = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: code.id, isActive }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "更新订阅用户失败");
      return;
    }
    setMessage(isActive ? "订阅用户已启用。" : "订阅用户已停用。");
    await loadAll();
  }

  async function deleteSubscription(code: SubscriptionAccount) {
    const deletePassword = window.prompt(`请输入删除密码，确认删除订阅用户：${code.username}\nEnter delete password to delete this user.`);
    if (!deletePassword) return;

    const response = await fetch("/api/admin/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: code.id, deletePassword }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "删除订阅用户失败");
      return;
    }
    setMessage("订阅用户已删除。");
    await loadAll();
  }

  async function deleteReport(report: AiReport) {
    const deletePassword = window.prompt(`请输入删除密码，确认删除报告文件和记录：${report.diagnosis}\nEnter delete password to delete this report file and record.`);
    if (!deletePassword) return;

    const response = await fetch("/api/admin/reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: report.id, deletePassword }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "删除报告失败");
      return;
    }
    setMessage("报告已删除。");
    await loadReports();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const imageTotalPages = Math.max(1, Math.ceil(imageTotal / imagePageSize));
  const imageFrom = imageTotal === 0 ? 0 : imagePage * imagePageSize + 1;
  const imageTo = Math.min((imagePage + 1) * imagePageSize, imageTotal);
  const reportTotalPages = Math.max(1, Math.ceil(reportTotal / reportPageSize));
  const reportFrom = reportTotal === 0 ? 0 : reportPage * reportPageSize + 1;
  const reportTo = Math.min((reportPage + 1) * reportPageSize, reportTotal);

  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="backLink" href="/"><ArrowLeft size={18} /> 首页 / Home</Link>
        <div className="navCluster">
          <LanguageToggle />
          <button className="secondaryButton inlineButton" onClick={logout}>
            <LogOut size={18} /> 退出 / Logout
          </button>
        </div>
      </div>

      <section className="adminHero">
        <div>
          <h1>后台管理 / Admin</h1>
          <p>管理眼底图片、考试任务和AI检测报告。图片存入 Cloudflare R2，业务数据写入 Supabase。</p>
        </div>
        <button className="secondaryButton inlineButton" onClick={loadAll} disabled={loading}>
          {loading ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />} 刷新 / Refresh
        </button>
      </section>

      <section className="statGrid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className="statCard" key={stat.label}>
              <Icon size={22} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          );
        })}
      </section>

      {message && <div className="notice">{message}</div>}

      <section className="adminLayout">
        <aside className="adminTabs">
          {tabs.map((item) => (
            <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}>
              {item.zh} / {item.en}
            </button>
          ))}
        </aside>

        <div className="adminPanel">
          {tab === "images" && (
            <div className="adminSection">
              <h2>图片管理 / Image Library</h2>
              <div className="imageToolbar">
                <label>
                  搜索 / Search
                  <input
                    value={imageSearch}
                    onChange={(event) => setImageSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") applyImageFilters();
                    }}
                    placeholder="编号、标题、诊断标签 / ID, title, diagnosis"
                  />
                </label>
                <label>
                  类型 / Type
                  <select value={imageTypeFilter} onChange={(event) => setImageTypeFilter(event.target.value)}>
                    <option value="">全部类型 / All types</option>
                    <option value="quiz">考试图片 / Quiz</option>
                    <option value="upload">用户上传 / Upload</option>
                    <option value="validation">验证集 / Validation</option>
                    <option value="paper">论文图 / Paper</option>
                  </select>
                </label>
                <label>
                  分级 / Grade
                  <select value={imageGradeFilter} onChange={(event) => setImageGradeFilter(event.target.value)}>
                    <option value="">全部分级 / All grades</option>
                    {gradeLabels.map((grade, index) => <option value={index} key={grade}>{index} - {grade}</option>)}
                  </select>
                </label>
                <label>
                  状态 / Status
                  <select value={imageStatusFilter} onChange={(event) => setImageStatusFilter(event.target.value)}>
                    <option value="">全部状态 / All status</option>
                    <option value="active">启用 / Active</option>
                    <option value="inactive">停用 / Disabled</option>
                  </select>
                </label>
                <label>
                  每页 / Page size
                  <select value={imagePageSize} onChange={(event) => setImagePageSize(Number(event.target.value))}>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </label>
                <button className="secondaryButton inlineButton" onClick={applyImageFilters} disabled={loading}>
                  {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 搜索 / Apply
                </button>
              </div>
              <form action={handleImageUpload} className="adminForm">
                <label>
                  图片编号 / Image ID
                  <input name="image_code" placeholder="例如：FUNDUS-001，不填则自动生成" />
                </label>
                <label>
                  标题 / Title
                  <input name="title" placeholder="例如：测试图像001" required />
                </label>
                <label>
                  类型 / Type
                  <select name="image_type" defaultValue="quiz">
                    <option value="quiz">考试图片 / Quiz</option>
                    <option value="upload">用户上传 / Upload</option>
                    <option value="validation">验证集 / Validation</option>
                    <option value="paper">论文图 / Paper</option>
                  </select>
                </label>
                <label>
                  分级 / Grade
                  <select name="disease_grade" defaultValue="0">
                    {gradeLabels.map((grade, index) => <option value={index} key={grade}>{index} - {grade}</option>)}
                  </select>
                </label>
                <label>
                  诊断标签 / Diagnosis
                  <input name="diagnosis_label" placeholder="Moderate diabetic retinopathy" />
                </label>
                <label>
                  眼底照片 / Fundus image
                  <input name="file" type="file" accept="image/*" required />
                </label>
                <input name="folder" type="hidden" value="fundus-images/quiz" />
                <button className="primaryButton" disabled={uploading || !isSupabaseConfigured}>
                  {uploading ? <Loader2 size={18} className="spin" /> : <UploadCloud size={18} />} 上传到R2 / Upload
                </button>
              </form>

              <div className="paginationBar">
                <span>
                  共 {imageTotal} 张 / Total {imageTotal}
                  {imageTotal > 0 ? `，当前 ${imageFrom}-${imageTo} / Showing ${imageFrom}-${imageTo}` : ""}
                </span>
                <div>
                  <button className="secondaryButton inlineButton" onClick={() => goToImagePage(imagePage - 1)} disabled={loading || imagePage === 0}>
                    上一页 / Previous
                  </button>
                  <strong>{imagePage + 1} / {imageTotalPages}</strong>
                  <button className="secondaryButton inlineButton" onClick={() => goToImagePage(imagePage + 1)} disabled={loading || imagePage + 1 >= imageTotalPages}>
                    下一页 / Next
                  </button>
                </div>
              </div>

              <div className="imageLibrary">
                {images.length === 0 && <p className="muted">暂无图片 / No images</p>}
                {images.map((image) => (
                  <article className="imageCard" id={`image-${image.id}`} key={image.id}>
                    <button className="adminImagePreviewButton" type="button" onClick={() => setPreviewImage(image)}>
                      <img src={image.image_url} alt={image.title || image.image_code || "fundus image"} />
                    </button>
                    <form className="imageEditForm" action={(formData) => updateImageMetadata(image, formData)}>
                      <label>
                        编号 / ID
                        <input name="image_code" defaultValue={image.image_code || ""} />
                      </label>
                      <label>
                        标题 / Title
                        <input name="title" defaultValue={image.title || ""} />
                      </label>
                      <label>
                        类型 / Type
                        <select name="image_type" defaultValue={image.image_type}>
                          <option value="quiz">考试图片 / Quiz</option>
                          <option value="upload">用户上传 / Upload</option>
                          <option value="validation">验证集 / Validation</option>
                          <option value="paper">论文图 / Paper</option>
                        </select>
                      </label>
                      <label>
                        正确分级 / Correct grade
                        <select name="disease_grade" defaultValue={image.disease_grade ?? ""}>
                          <option value="">未设置 / Not set</option>
                          {gradeLabels.map((grade, index) => <option value={index} key={grade}>{index} - {grade}</option>)}
                        </select>
                      </label>
                      <label>
                        诊断标签 / Diagnosis
                        <input name="diagnosis_label" defaultValue={image.diagnosis_label || ""} />
                      </label>
                      <label>
                        状态 / Status
                        <select name="is_active" defaultValue={String(image.is_active)}>
                          <option value="true">启用 / Active</option>
                          <option value="false">停用 / Disabled</option>
                        </select>
                      </label>
                      <button className="secondaryButton inlineButton">
                        <Save size={16} /> 保存 / Save
                      </button>
                    </form>
                    <div className="imageActions">
                      {image.is_active && (
                        <button className="secondaryButton inlineButton" onClick={() => disableImage(image)}>
                          停用 / Disable
                        </button>
                      )}
                      <button className="dangerButton" onClick={() => deleteImage(image)}>
                        <Trash2 size={16} /> 删除 / Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="paginationBar bottom">
                <span>第 {imagePage + 1} 页 / Page {imagePage + 1}</span>
                <div>
                  <button className="secondaryButton inlineButton" onClick={() => goToImagePage(imagePage - 1)} disabled={loading || imagePage === 0}>
                    上一页 / Previous
                  </button>
                  <button className="secondaryButton inlineButton" onClick={() => goToImagePage(imagePage + 1)} disabled={loading || imagePage + 1 >= imageTotalPages}>
                    下一页 / Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "quizzes" && (
            <div className="adminSection">
              <h2>考试管理 / Quiz Management</h2>
              <form action={createQuiz} className="adminForm">
                <label>
                  考试名称 / Quiz title
                  <input name="title" placeholder="眼底图像100题测试" required />
                </label>
                <label>
                  说明 / Description
                  <textarea name="description" placeholder="面向眼科医生的DR分级测试" />
                </label>
                <button className="primaryButton" disabled={!isSupabaseConfigured}>
                  <Plus size={18} /> 创建考试 / Create
                </button>
              </form>
              <DataTable
                columns={["考试 / Quiz", "说明 / Description", "状态 / Status"]}
                rows={quizzes.map((quiz) => [quiz.title, quiz.description || "-", quiz.is_active ? "启用 / Active" : "停用 / Disabled"])}
              />
            </div>
          )}

          {tab === "reports" && (
            <div className="adminSection">
              <h2>报告档案 / AI Report Archive</h2>
              <div className="notice">
                AI检测默认只保存在用户当前浏览器。只有在报告页点击“保存档案 / Archive”后，才会进入这里。建议不要保存患者姓名、手机号等身份信息。
              </div>
              <div className="imageToolbar">
                <label>
                  搜索 / Search
                  <input
                    value={reportSearch}
                    onChange={(event) => setReportSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") applyReportFilters();
                    }}
                    placeholder="诊断、风险、建议 / Diagnosis, risk, recommendation"
                  />
                </label>
                <label>
                  风险 / Risk
                  <select value={reportRiskFilter} onChange={(event) => setReportRiskFilter(event.target.value)}>
                    <option value="">全部风险 / All risks</option>
                    <option value="Low">低 / Low</option>
                    <option value="Moderate">中 / Moderate</option>
                    <option value="High">高 / High</option>
                  </select>
                </label>
                <label>
                  每页 / Page size
                  <select value={reportPageSize} onChange={(event) => setReportPageSize(Number(event.target.value))}>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
                <button className="secondaryButton inlineButton" onClick={applyReportFilters} disabled={loading}>
                  {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 搜索 / Apply
                </button>
              </div>
              <div className="paginationBar">
                <span>
                  共 {reportTotal} 份 / Total {reportTotal}
                  {reportTotal > 0 ? `，当前 ${reportFrom}-${reportTo} / Showing ${reportFrom}-${reportTo}` : ""}
                </span>
                <div>
                  <button className="secondaryButton inlineButton" onClick={() => goToReportPage(reportPage - 1)} disabled={loading || reportPage === 0}>
                    上一页 / Previous
                  </button>
                  <strong>{reportPage + 1} / {reportTotalPages}</strong>
                  <button className="secondaryButton inlineButton" onClick={() => goToReportPage(reportPage + 1)} disabled={loading || reportPage + 1 >= reportTotalPages}>
                    下一页 / Next
                  </button>
                </div>
              </div>
              <DataTable
                columns={["诊断 / Diagnosis", "置信度 / Confidence", "风险 / Risk", "病灶数 / Lesions", "PDF", "时间 / Created", "操作 / Action"]}
                rows={reports.map((report) => [
                  report.diagnosis,
                  report.confidence?.toFixed(3) || "-",
                  report.risk_level || "-",
                  Array.isArray(report.lesions) ? report.lesions.length : 0,
                  report.pdf_size_bytes ? `${Math.round(report.pdf_size_bytes / 1024)} KB` : "无PDF / No PDF",
                  new Date(report.created_at).toLocaleString(),
                  "删除 / Delete",
                ])}
                actions={reports.map((report) => (
                  <div className="tableActions">
                    {report.pdf_url && (
                      <>
                        <button className="secondaryButton inlineButton" onClick={() => setPreviewReport(report)}>
                          <Eye size={16} /> 预览 / Preview
                        </button>
                        <a className="secondaryButton inlineButton" href={report.pdf_url} target="_blank" rel="noreferrer">
                          <Download size={16} /> 下载 / Download
                        </a>
                      </>
                    )}
                    <button className="dangerButton" onClick={() => deleteReport(report)}>
                      <Trash2 size={16} /> 删除 / Delete
                    </button>
                  </div>
                ))}
              />
            </div>
          )}

          {tab === "access" && (
            <div className="adminSection">
              <h2>订阅用户 / Subscription Users</h2>
              <form action={createSubscription} className="adminForm">
                <label>
                  用户名 / Username
                  <input name="username" placeholder="doctor001" required />
                </label>
                <label>
                  档案名称 / Label
                  <input name="label" placeholder="张医生-2026年7月 / Dr Zhang July" />
                </label>
                <label>
                  有效天数 / Valid days
                  <input name="days" type="number" min="1" defaultValue="30" />
                </label>
                <label>
                  最大登录次数 / Max logins
                  <input name="max_uses" type="number" min="1" placeholder="不填则不限 / Blank means unlimited" />
                </label>
                <label>
                  自定义密码/访问码 / Custom password/code
                  <input name="code" placeholder="不填则自动生成 / Auto-generate if blank" />
                </label>
                <button className="primaryButton">
                  <KeyRound size={18} /> 创建订阅用户 / Create
                </button>
              </form>
              {newSubscriptionCode && (
                <div className="accessCodeBox">
                  <span>新密码/访问码 / New password/code</span>
                  <strong>{newSubscriptionCode}</strong>
                  <button className="secondaryButton inlineButton" onClick={() => navigator.clipboard.writeText(newSubscriptionCode)}>
                    复制 / Copy
                  </button>
                </div>
              )}
              <DataTable
                columns={["用户名 / Username", "档案 / Label", "到期 / Expires", "使用 / Uses", "状态 / Status", "当前会话 / Active session", "最后使用 / Last used", "操作 / Action"]}
                rows={subscriptions.map((code) => [
                  code.username,
                  code.label,
                  new Date(code.expires_at).toLocaleString(),
                  `${code.use_count}${code.max_uses ? ` / ${code.max_uses}` : ""}`,
                  code.is_active ? "启用 / Active" : "停用 / Disabled",
                  code.active_session_started_at ? new Date(code.active_session_started_at).toLocaleString() : "-",
                  code.last_used_at ? new Date(code.last_used_at).toLocaleString() : "-",
                  code.is_active ? "停用 / Disable" : "启用 / Enable",
                ])}
                actions={subscriptions.map((code) => (
                  <div className="tableActions">
                    <button className="secondaryButton inlineButton" onClick={() => setAccessActive(code, !code.is_active)}>
                      {code.is_active ? "停用 / Disable" : "启用 / Enable"}
                    </button>
                    <button className="dangerButton" onClick={() => deleteSubscription(code)}>
                      <Trash2 size={16} /> 删除 / Delete
                    </button>
                  </div>
                ))}
              />
            </div>
          )}

          {tab === "settings" && (
            <div className="adminSection">
              <h2>连接设置 / Connection Settings</h2>
              <div className="settingsList">
                <p><strong>Supabase:</strong> {isSupabaseConfigured ? "已配置 / Configured" : "未配置 / Missing"}</p>
                <p>需要在 Vercel 添加：NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY。</p>
                <p>R2上传接口需要在 Vercel 添加：R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME、R2_PUBLIC_BASE_URL。</p>
                <p>先在 Supabase SQL Editor 执行 database/supabase_schema.sql，再使用本后台。</p>
              </div>
            </div>
          )}
        </div>
      </section>
      {previewImage && (
        <div className="imageModal" role="dialog" aria-modal="true">
          <div className="imageModalContent adminImageModal">
            <button className="modalClose" onClick={() => setPreviewImage(null)} aria-label="关闭 / Close">
              <X size={20} />
            </button>
            <img src={previewImage.image_url} alt={previewImage.title || previewImage.image_code || "fundus image"} />
            <div className="modalInfo">
              <strong>{previewImage.title || previewImage.image_code || "眼底图片 / Fundus image"}</strong>
              <span>编号 / ID: {previewImage.image_code || "-"}</span>
              <span>分级 / Grade: {previewImage.disease_grade !== null && previewImage.disease_grade !== undefined ? `${previewImage.disease_grade} - ${gradeLabels[previewImage.disease_grade]}` : "未设置 / Not set"}</span>
              <span>诊断 / Diagnosis: {previewImage.diagnosis_label || "-"}</span>
              <button
                className="primaryButton reportButton"
                onClick={() => {
                  setPreviewImage(null);
                  window.setTimeout(() => {
                    document.getElementById(`image-${previewImage.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 80);
                }}
              >
                编辑这张图 / Edit this image
              </button>
            </div>
          </div>
        </div>
      )}
      {previewReport?.pdf_url && (
        <div className="imageModal" role="dialog" aria-modal="true">
          <div className="pdfModalContent">
            <button className="modalClose" onClick={() => setPreviewReport(null)} aria-label="关闭 / Close">
              <X size={20} />
            </button>
            <div className="pdfModalHeader">
              <strong>{previewReport.diagnosis}</strong>
              <a className="secondaryButton inlineButton" href={previewReport.pdf_url} target="_blank" rel="noreferrer">
                <Download size={16} /> 下载PDF / Download PDF
              </a>
            </div>
            <iframe src={previewReport.pdf_url} title="AI report PDF preview" />
          </div>
        </div>
      )}
    </main>
  );
}

function DataTable({ columns, rows, actions }: { columns: string[]; rows: Array<Array<string | number>>; actions?: React.ReactNode[] }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>暂无数据 / No data</td>
            </tr>
          )}
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{actions && cellIndex === row.length - 1 ? actions[rowIndex] : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
