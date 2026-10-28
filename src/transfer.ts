import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

export async function exportFile(contents: string, name: string, mime: string) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([contents], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, name);
  file.write(contents);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  await Sharing.shareAsync(file.uri, {
    mimeType: mime,
    dialogTitle: "Export Fit Track data",
    UTI:
      mime === "application/json"
        ? "public.json"
        : "public.comma-separated-values-text",
  });
}
export async function pickBackup(allowCsv = false): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: allowCsv
      ? [
          "application/json",
          "text/plain",
          "text/csv",
          "application/vnd.ms-excel",
        ]
      : ["application/json", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 25_000_000)
    throw new Error("This backup exceeds the 25 MB limit.");
  if (Platform.OS === "web") {
    if (asset.file) return asset.file.text();
    return (await fetch(asset.uri)).text();
  }
  return new File(asset.uri).text();
}
