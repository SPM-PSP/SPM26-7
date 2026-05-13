/**
 * 截图工具函数
 * 使用浏览器原生API实现页面截图功能
 */

/**
 * 将HTML元素转换为Canvas并下载为图片
 * @param element 要截图的HTML元素
 * @param filename 下载的文件名
 * @param options 截图选项
 */
export async function captureElementAsImage(
  element: HTMLElement,
  filename: string = 'screenshot.png',
  options: {
    backgroundColor?: string;
    scale?: number;
    quality?: number;
    format?: 'png' | 'jpeg';
  } = {}
): Promise<void> {
  const {
    backgroundColor = '#ffffff',
    scale = 2,
    quality = 0.9,
    format = 'png'
  } = options;

  try {
    // 动态导入html2canvas
    const html2canvas = await import('html2canvas');
    
    // 获取元素的尺寸
    const rect = element.getBoundingClientRect();
    
    // 配置html2canvas选项
    const canvas = await html2canvas.default(element, {
      backgroundColor,
      scale,
      useCORS: true,
      allowTaint: true,
      height: rect.height,
      width: rect.width,
      scrollX: 0,
      scrollY: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      // 确保捕获完整内容
      logging: false,
      // 处理字体渲染
      foreignObjectRendering: true,
    });

    // 转换为blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        `image/${format}`,
        quality
      );
    });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理URL
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('截图失败:', error);
    throw new Error('截图功能暂时不可用，请稍后重试');
  }
}

/**
 * 使用浏览器原生截图API（如果支持）
 * @param element 要截图的元素
 * @param filename 文件名
 */
export async function captureWithNativeAPI(
  element: HTMLElement,
  filename: string = 'screenshot.png'
): Promise<void> {
  try {
    // 检查是否支持Screen Capture API
    if (!('getDisplayMedia' in navigator.mediaDevices)) {
      throw new Error('浏览器不支持屏幕捕获API');
    }

    // 请求屏幕捕获权限
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: 'screen'
      }
    });

    // 创建video元素来捕获流
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    // 等待视频加载
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    // 创建canvas来绘制视频帧
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 绘制当前帧
    ctx.drawImage(video, 0, 0);
    
    // 停止流
    stream.getTracks().forEach(track => track.stop());

    // 转换为blob并下载
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('原生截图失败:', error);
    throw new Error('屏幕捕获失败，请检查浏览器权限设置');
  }
}

/**
 * 简单的DOM转图片功能（不依赖外部库）
 * @param element 要截图的元素
 * @param filename 文件名
 */
export async function captureElementSimple(
  element: HTMLElement,
  filename: string = 'screenshot.png'
): Promise<void> {
  try {
    // 获取元素的样式和内容
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    // 创建SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', rect.width.toString());
    svg.setAttribute('height', rect.height.toString());
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    
    // 创建foreignObject来包含HTML内容
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('width', '100%');
    foreignObject.setAttribute('height', '100%');
    
    // 克隆元素
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // 应用样式
    clonedElement.style.width = rect.width + 'px';
    clonedElement.style.height = rect.height + 'px';
    clonedElement.style.backgroundColor = computedStyle.backgroundColor || '#ffffff';
    
    foreignObject.appendChild(clonedElement);
    svg.appendChild(foreignObject);
    
    // 转换为数据URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    // 创建图片
    const img = new Image();
    img.onload = () => {
      // 创建canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = rect.width * 2; // 高分辨率
      canvas.height = rect.height * 2;
      
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      
      // 转换为blob并下载
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
      
      URL.revokeObjectURL(svgUrl);
    };
    
    img.src = svgUrl;
    
  } catch (error) {
    console.error('简单截图失败:', error);
    throw new Error('截图功能暂时不可用');
  }
}

/**
 * 智能截图函数 - 自动选择最佳截图方法
 * @param element 要截图的元素
 * @param filename 文件名
 * @param options 选项
 */
export async function smartCapture(
  element: HTMLElement,
  filename: string = 'summary-screenshot.png',
  options: {
    preferredMethod?: 'html2canvas' | 'native' | 'simple';
    backgroundColor?: string;
    scale?: number;
  } = {}
): Promise<void> {
  const { preferredMethod = 'html2canvas', backgroundColor = '#ffffff', scale = 2 } = options;
  
  // 添加时间戳到文件名
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const finalFilename = filename.replace('.png', `_${timestamp}.png`);
  
  try {
    switch (preferredMethod) {
      case 'html2canvas':
        await captureElementAsImage(element, finalFilename, { backgroundColor, scale });
        break;
      case 'native':
        await captureWithNativeAPI(element, finalFilename);
        break;
      case 'simple':
        await captureElementSimple(element, finalFilename);
        break;
      default:
        // 尝试html2canvas，失败则使用简单方法
        try {
          await captureElementAsImage(element, finalFilename, { backgroundColor, scale });
        } catch {
          await captureElementSimple(element, finalFilename);
        }
    }
  } catch (error) {
    console.error('所有截图方法都失败了:', error);
    throw error;
  }
}
