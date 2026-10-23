import api from "../services/api";

// ================== AUTHORIZED RESUME ACCESS ==================
// Reuse the same filename-preserving preview/download behavior across panels.
export async function openPrivateResume({ endpoint, filename, mode, isActive = () => true }) {
    let previewWindow = null;
    let objectUrl = "";
    if (mode === "view") {
        previewWindow = window.open("about:blank", "_blank");
        if (!previewWindow) throw new Error("Please allow popups to view the resume.");
        previewWindow.opener = null;
        previewWindow.document.title = filename;
        previewWindow.document.body.textContent = "Loading resume...";
    }
    try {
        const { data } = await api.get(endpoint, {
            params: { mode },
            responseType: "blob",
            timeout: 75000,
        });
        if (!isActive()) {
            previewWindow?.close();
            return;
        }
        if (!data.size) throw new Error("The resume response is empty.");
        objectUrl = URL.createObjectURL(data);
        if (mode === "download") {
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = filename;
            link.hidden = true;
            document.body.appendChild(link);
            link.click();
            link.remove();
            const downloadUrl = objectUrl;
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
            objectUrl = "";
            return;
        }
        if (!previewWindow || previewWindow.closed) return;
        const doc = previewWindow.document;
        doc.body.replaceChildren();
        // This is a separate document, so its styles do not belong to panel.css.
        const style = doc.createElement("style");
        style.textContent = `
            html, body { height: 100%; margin: 0; }
            body { display: flex; flex-direction: column; font-family: Arial, sans-serif; background: #f3f4f6; color: #172033; }
            header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; }
            h1 { margin: 0; font-size: 16px; font-weight: 600; overflow-wrap: anywhere; }
            a { padding: 9px 14px; border-radius: 6px; background: #2563eb; color: #fff; font-size: 14px; text-decoration: none; }
            iframe { flex: 1; width: 100%; min-height: 0; border: 0; }
        `;
        doc.head.appendChild(style);
        const header = doc.createElement("header");
        const title = doc.createElement("h1");
        title.textContent = filename;
        const link = doc.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        link.textContent = "Download resume";
        const frame = doc.createElement("iframe");
        frame.title = filename;
        frame.src = objectUrl;
        header.append(title, link);
        doc.body.append(header, frame);
        const previewUrl = objectUrl;
        const timer = setInterval(() => {
            if (previewWindow.closed) {
                URL.revokeObjectURL(previewUrl);
                clearInterval(timer);
            }
        }, 1000);
        objectUrl = "";
    } catch (error) {
        previewWindow?.close();
        if (error.response?.data instanceof Blob) {
            try {
                const data = JSON.parse(await error.response.data.text());
                if (typeof data.message === "string") error.message = data.message;
            } catch {
                /* Keep the original error if the response is not JSON. */
            }
        }
        throw error;
    } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
}
