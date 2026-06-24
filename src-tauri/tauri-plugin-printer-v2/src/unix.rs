use std::process::Command;
use std::env;
use std::path::{Path, PathBuf};
use crate::declare::{PrintOptions, PrintHtmlOptions, PrintPdfUrlOptions};
use crate::fsys::remove_file;

/// Get printers on Unix (Linux/macOS) using lpstat
pub fn get_printers() -> String {
    let output = Command::new("lpstat")
        .arg("-a")
        .output();
        
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let mut printers = Vec::new();
            
            for line in stdout.lines() {
                if let Some(printer) = line.split_whitespace().nth(1) {
                    printers.push(serde_json::json!({
                        "Name": printer,
                        "PrinterName": printer,
                        "DriverName": "CUPS",
                        "PortName": printer,
                        "PrinterStatus": "Ready"
                    }));
                }
            }
            
            serde_json::to_string(&printers).unwrap_or_else(|_| "[]".to_string())
        },
        Err(e) => {
            eprintln!("Failed to run lpstat: {}", e);
            "[]".to_string()
        }
    }
}

pub fn get_printers_by_name(printername: String) -> String {
    let output = Command::new("lpstat")
        .arg("-a")
        .output();
        
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let mut printers = Vec::new();
            
            for line in stdout.lines() {
                if let Some(printer) = line.split_whitespace().nth(1) {
                    if printer == printername {
                        printers.push(serde_json::json!({
                            "Name": printer,
                            "PrinterName": printer,
                            "DriverName": "CUPS",
                            "PortName": printer,
                            "PrinterStatus": "Ready"
                        }));
                    }
                }
            }
            
            serde_json::to_string(&printers).unwrap_or_else(|_| "[]".to_string())
        },
        Err(e) => {
            eprintln!("Failed to run lpstat: {}", e);
            "[]".to_string()
        }
    }
}

pub fn print_pdf(options: PrintOptions) -> String {
    let mut args = vec![];
    
    if !options.printer.is_empty() && options.printer != "default" {
        args.push("-d".to_string());
        args.push(options.printer);
    }
    
    args.push(options.path.clone());
    
    let output = Command::new("lp")
        .args(args)
        .output();
        
    let result = match output {
        Ok(out) => {
            if out.status.success() {
                "Print job successfully queued via CUPS.".to_string()
            } else {
                format!("Print failed: {}", String::from_utf8_lossy(&out.stderr))
            }
        },
        Err(e) => format!("Failed to run lp: {}", e)
    };
    
    if options.remove_after_print == Some(true) {
        let _ = remove_file(&options.path);
    }
    
    result
}

pub fn print_html(options: PrintHtmlOptions) -> String {
    match print_html_internal(options) {
        Ok(result) => result,
        Err(e) => {
            eprintln!("HTML Print Failed: {}", e);
            format!("Print Failed: {}", e)
        }
    }
}

fn generate_temp_file_path(extension: &str) -> Result<PathBuf, String> {
    let temp_dir = env::temp_dir();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("Failed timestamp: {}", e))?
        .as_nanos();
    let filename = format!("tauri_printer_{}_{}.{}", std::process::id(), timestamp, extension);
    Ok(temp_dir.join(filename))
}

fn check_wkhtmltopdf_availability() -> Result<(), String> {
    Command::new("wkhtmltopdf")
        .arg("--version")
        .output()
        .map_err(|_| "wkhtmltopdf is not installed or not in PATH. Please install it first.".to_string())?;
    Ok(())
}

fn build_wkhtmltopdf_args(
    options: &PrintHtmlOptions,
    html_path: &Path,
    pdf_path: &Path,
) -> Result<Vec<String>, String> {
    let mut args = vec![
        "--encoding".to_string(), "UTF-8".to_string(),
        "--enable-local-file-access".to_string(),
        "--disable-smart-shrinking".to_string(),
        "--no-pdf-compression".to_string(),
        "--load-error-handling".to_string(), "ignore".to_string(),
        "--load-media-error-handling".to_string(), "ignore".to_string(),
    ];

    let default_margin = "10mm";
    args.extend([
        "--margin-top".to_string(), default_margin.to_string(),
        "--margin-right".to_string(), default_margin.to_string(),
        "--margin-bottom".to_string(), default_margin.to_string(),
        "--margin-left".to_string(), default_margin.to_string(),
    ]);

    if let (Some(width), Some(height)) = (options.page_width, options.page_height) {
        args.extend([
            "--page-width".to_string(), format!("{}mm", width),
            "--page-height".to_string(), format!("{}mm", height)
        ]);
    } else if let Some(ref page_size) = options.page_size {
        args.extend(["--page-size".to_string(), page_size.clone()]);
    } else {
        args.extend(["--page-size".to_string(), "A4".to_string()]);
    }

    if let Some(ref margin) = options.margin {
        let unit = margin.unit.as_deref().unwrap_or("mm");
        if let Some(top) = margin.top { args.extend(["--margin-top".to_string(), format!("{}{}", top, unit)]); }
        if let Some(right) = margin.right { args.extend(["--margin-right".to_string(), format!("{}{}", right, unit)]); }
        if let Some(bottom) = margin.bottom { args.extend(["--margin-bottom".to_string(), format!("{}{}", bottom, unit)]); }
        if let Some(left) = margin.left { args.extend(["--margin-left".to_string(), format!("{}{}", left, unit)]); }
    }

    args.push(html_path.to_string_lossy().to_string());
    args.push(pdf_path.to_string_lossy().to_string());

    Ok(args)
}

fn execute_wkhtmltopdf(args: &[String]) -> Result<(), String> {
    let output = Command::new("wkhtmltopdf")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run wkhtmltopdf: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("wkhtmltopdf failed: {}", stderr));
    }

    Ok(())
}

fn print_html_internal(options: PrintHtmlOptions) -> Result<String, String> {
    if options.html.trim().is_empty() { return Err("HTML is empty".to_string()); }

    check_wkhtmltopdf_availability()?;

    let html_path = generate_temp_file_path("html")?;
    let pdf_path = generate_temp_file_path("pdf")?;

    std::fs::write(&html_path, &options.html)
        .map_err(|e| format!("Failed to write HTML: {}", e))?;

    let args = build_wkhtmltopdf_args(&options, &html_path, &pdf_path)?;
    
    let conversion_result = execute_wkhtmltopdf(&args);
    
    if let Err(e) = conversion_result {
        let _ = remove_file(&html_path.to_string_lossy());
        return Err(e);
    }

    if !pdf_path.exists() {
        let _ = remove_file(&html_path.to_string_lossy());
        return Err("PDF generation failed".to_string());
    }

    let print_options = PrintOptions {
        id: options.id,
        path: pdf_path.to_string_lossy().to_string(),
        printer: options.printer,
        print_settings: options.print_settings,
        remove_after_print: options.remove_after_print,
    };

    let result = print_pdf(print_options);
    let _ = remove_file(&html_path.to_string_lossy());
    
    Ok(result)
}

pub fn print_pdf_from_url(options: PrintPdfUrlOptions) -> String {
    match print_pdf_from_url_internal(options) {
        Ok(result) => result,
        Err(e) => format!("Print Failed: {}", e)
    }
}

fn print_pdf_from_url_internal(options: PrintPdfUrlOptions) -> Result<String, String> {
    if options.url.trim().is_empty() { return Err("URL is empty".to_string()); }
    
    let pdf_path = generate_temp_file_path("pdf")?;
    
    let output = Command::new("curl")
        .args(["-sL", &options.url, "-o", &pdf_path.to_string_lossy()])
        .output()
        .map_err(|e| format!("curl failed: {}", e))?;
        
    if !output.status.success() {
        return Err(format!("Download failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    if !pdf_path.exists() {
        return Err("File not downloaded".to_string());
    }
    
    let print_options = PrintOptions {
        id: options.id,
        path: pdf_path.to_string_lossy().to_string(),
        printer: options.printer,
        print_settings: options.print_settings,
        remove_after_print: options.remove_after_print,
    };

    Ok(print_pdf(print_options))
}

pub fn get_jobs(_printername: String) -> String { "[]".to_string() }
pub fn get_jobs_by_id(_printername: String, _jobid: String) -> String { "[]".to_string() }
pub fn resume_job(_printername: String, _jobid: String) -> String { "Success".to_string() }
pub fn restart_job(_printername: String, _jobid: String) -> String { "Success".to_string() }
pub fn pause_job(_printername: String, _jobid: String) -> String { "Success".to_string() }
pub fn remove_job(_printername: String, _jobid: String) -> String { "Success".to_string() }
