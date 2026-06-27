"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database, FileText, ImagePlus, Loader2, LogOut, Plus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { LanguageToggle } from "../components/LanguageToggle";
import { AiReport, FundusImage, Quiz, isSupabaseConfigured, supabase } from "../lib/supabase";

type AdminTab = "images" | "quizzes" | "reports" | "settings";

const tabs: Array<{ id: AdminTab; zh: string; en: string }> = [
  { id: "images", zh: "图片管理", en: "Images" },
  { id: "quizzes", zh: "考试管理", en: "Quizzes" },
  { id: "reports", zh: "报告浏览", en: "Reports" },
  { id: "settings", zh: "连接设置", en: "Settings" },
];

const gradeLabels = ["无DR / No DR", "轻度 / Mild", "中度 / Moderate", "重度 / Severe", "增殖期 / Proliferative"];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("images");
  const [images, setImages] = useState<FundusImage[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const stats = useMemo(
    () => [
      { label: "眼底图片 / Images", value: images.length, icon: ImagePlus },
      { label: "考试 / Quizzes", value: quizzes.length, icon: Database },
      { label: "AI报告 / Reports", value: reports.length, icon: FileText },
    ],
    [images.length, quizzes.length, reports.length]
  );

  async function loadAll() {
    if (!isSupabaseConfigured) {
      setMessage("请先在 Vercel 环境变量中配置 Supabase。");
      return;
    }

    setLoading(true);
    setMessage("");
    const [imageResult, quizResult, reportResult] = await Promise.all([
      supabase.from("fundus_images").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("quizzes").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_reports").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    if (imageResult.error || quizResult.error || reportResult.error) {
      setMessage(imageResult.error?.message || quizResult.error?.message || reportResult.error?.message || "加载失败");
    } else {
      setImages((imageResult.data || []) as FundusImage[]);
      setQuizzes((quizResult.data || []) as Quiz[]);
      setReports((reportResult.data || []) as AiReport[]);
    }
    setLoading(false);
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
      await loadAll();
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
      await loadAll();
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
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    }
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

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

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

              <div className="imageLibrary">
                {images.length === 0 && <p className="muted">暂无图片 / No images</p>}
                {images.map((image) => (
                  <article className="imageCard" key={image.id}>
                    <img src={image.image_url} alt={image.title || image.image_code || "fundus image"} />
                    <div className="imageCardBody">
                      <strong>{image.image_code || "未编号 / No ID"}</strong>
                      <span>{image.title || "未命名 / Untitled"}</span>
                      <span>类型 / Type: {image.image_type}</span>
                      <span>分级 / Grade: {image.disease_grade ?? "-"}</span>
                      <span>{image.is_active ? "启用 / Active" : "停用 / Disabled"}</span>
                    </div>
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
              <h2>报告浏览 / AI Reports</h2>
              <DataTable
                columns={["诊断 / Diagnosis", "置信度 / Confidence", "风险 / Risk", "时间 / Created"]}
                rows={reports.map((report) => [
                  report.diagnosis,
                  report.confidence?.toFixed(3) || "-",
                  report.risk_level || "-",
                  new Date(report.created_at).toLocaleString(),
                ])}
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
    </main>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<string | number>> }) {
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
              {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
