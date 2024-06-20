// 扩展 String 对象，添加 remove 方法
String.prototype.remove = function (toRemove) {
  if (Array.isArray(toRemove)) {
    return toRemove.reduce((acc, value) => acc.replace(value, ''), this);
  }
  if (typeof toRemove === 'string') {
    return this.replace(toRemove, '');
  }
  return this;
};

// 清理对象，删除值为 undefined 的属性
const cleanupObject = (obj) => {
  Object.keys(obj).forEach((key) => (obj[key] === undefined ? delete obj[key] : {}));
  return obj;
};

// 判断是否为文件夹
const isFolder = (item) => !!item.match(/<H3.*>.*<\/H3>/);

// 判断是否为链接
const isLink = (item) => !!item.match(/<A.*>.*<\/A>/);

// 获取标题
const getTitle = (item) => item.match(/<(H3|A).*>(.*)<\/(H3|A)>/)?.[2];

// 获取图标
const getIcon = (item) => item.match(/ICON="(.+)"/)?.[1];

// 获取URL
const getUrl = (item) => item.match(/HREF="([^"]*)"/)?.[1];

// 获取数值属性
const getNumericProperty = (item, property) => {
  const match = item.match(new RegExp(`${property}="([\\d]+)"`));
  return match ? parseInt(match[1]) : undefined;
};

// 转换链接为对象
const transformLink = (markup) =>
  cleanupObject({
    type: 'link',
    addDate: getNumericProperty(markup, 'ADD_DATE'),
    title: getTitle(markup),
    icon: getIcon(markup),
    url: getUrl(markup),
  });

// 转换文件夹为对象
const transformFolder = (markup) =>
  cleanupObject({
    type: 'folder',
    addDate: getNumericProperty(markup, 'ADD_DATE'),
    lastModified: getNumericProperty(markup, 'LAST_MODIFIED'),
    title: getTitle(markup),
  });

// 查找指定缩进级别的项目
const findItemsAtIndentLevel = (markup, level) =>
  markup.match(new RegExp(`^\\s{${level * 4}}<DT>(.*)[\r\n]`, 'gm'));

// 查找指定缩进级别的链接
const findLinks = (markup, level) => findItemsAtIndentLevel(markup, level).filter(isLink);

// 查找指定缩进级别的文件夹
const findFolders = (markup, level) => {
  const folders = findItemsAtIndentLevel(markup, level);
  return folders?.map((folder, index) => {
    const isLastOne = index === folders.length - 1;
    return markup.substring(
      markup.indexOf(folder),
      isLastOne ? undefined : markup.indexOf(folders[index + 1]),
    );
  });
};

// 查找子项目
const findChildren = (markup, level = 1) => {
  if (findItemsAtIndentLevel(markup, level)) {
    const links = findLinks(markup, level);
    const folders = findFolders(markup.remove(links), level);
    return [...(links || []), ...(folders || [])];
  }
};

// 处理子项目
const processChild = (child, level = 1) => {
  if (isFolder(child)) return processFolder(child, level);
  if (isLink(child)) return transformLink(child);
};

// 处理文件夹及其子项目
const processFolder = (folder, level) => {
  const children = findChildren(folder, level + 1);
  return cleanupObject({
    ...transformFolder(folder),
    children: children?.map((child) => processChild(child, level + 1))?.filter(Boolean),
  });
};

// 将书签转换为JSON格式
const bookmarksToJSON = (markup, { stringify = true, formatJSON = false, spaces = 2 } = {}) => {
  const obj = findChildren(markup)?.map(child => processChild(child));
  if (!stringify) return obj;
  return JSON.stringify(obj, ...(formatJSON ? [null, spaces] : []));
};

// 处理文件输入和拖放上传的交互逻辑
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileName');
const fileSizeDisplay = document.getElementById('fileSize');
const dropZone = document.getElementById('dropZone');
const uploadButton = document.getElementById('uploadButton');
const statusIndicator = document.getElementById('status');
const fileDetails = document.getElementById('fileDetails');

// 根据文件大小选择合适的单位
const formatFileSize = (size) => {
  return size > 1024 ? `${(size / 1024).toFixed(2)} MB` : `${size.toFixed(2)} KB`;
};

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const fileName = file ? file.name : 'Choose file';
  fileNameDisplay.textContent = fileName;
  if (file) {
    if (file.type !== 'text/html') {
      alert('Please re-upload the bookmarks file in html format');
      fileInput.value = ''; // 清空文件输入
      fileNameDisplay.textContent = 'Choose file';
      fileSizeDisplay.style.display = 'none';
      uploadButton.style.display = 'none';
      fileDetails.style.display = 'none';
      return;
    }
    fileSizeDisplay.textContent = `Size: ${formatFileSize(file.size / 1024)}`;
    fileSizeDisplay.style.display = 'block';
    uploadButton.style.display = 'inline-flex';
    statusIndicator.style.display = 'none'; // 隐藏状态指示器
    fileDetails.style.display = 'flex'; // 显示文件详细信息
  } else {
    fileSizeDisplay.style.display = 'none';
    uploadButton.style.display = 'none';
    fileDetails.style.display = 'none';
  }
  uploadButton.textContent = 'Convert';
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragover');
  const files = event.dataTransfer.files;
  if (files.length) {
    fileInput.files = files;
    const file = files[0];
    const fileName = file.name;
    fileNameDisplay.textContent = fileName;
    if (file.type !== 'text/html') {
      alert('Please re-upload the bookmarks file in html format');
      fileInput.value = ''; // 清空文件输入
      fileNameDisplay.textContent = 'Choose file';
      fileSizeDisplay.style.display = 'none';
      uploadButton.style.display = 'none';
      fileDetails.style.display = 'none';
      return;
    }
    fileSizeDisplay.textContent = `Size: ${formatFileSize(file.size / 1024)}`;
    fileSizeDisplay.style.display = 'block';
    uploadButton.style.display = 'inline-flex';
    statusIndicator.style.display = 'none'; // 隐藏状态指示器
    fileDetails.style.display = 'flex'; // 显示文件详细信息
    uploadButton.textContent = 'Convert';
  }
});

uploadButton.addEventListener('click', async () => {
  if (!fileInput.files.length) {
    alert('Please select a file first.');
    return;
  }

  uploadButton.style.display = 'none';
  statusIndicator.className = 'group gap-2 inline-flex items-center justify-center rounded-full py-2 px-6 text-sm font-semibold text-green-600';
  statusIndicator.textContent = 'Uploading...';
  statusIndicator.style.display = 'inline-flex';
  await new Promise((resolve) => setTimeout(resolve, 1000));  // 模拟文件上传

  statusIndicator.className = 'group gap-2 inline-flex items-center justify-center rounded-full py-2 px-6 text-sm font-semibold text-green-600';
  statusIndicator.textContent = 'Uploaded 100%';
  await new Promise((resolve) => setTimeout(resolve, 1000));  // 模拟文件处理

  statusIndicator.className = 'group gap-2 inline-flex items-center justify-center rounded-full py-2 px-6 text-sm font-semibold text-green-600';
  statusIndicator.innerHTML = `
      <svg class="animate-spin h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
    <circle class="opacity-25" cx="8" cy="8" r="5" stroke="currentColor" stroke-width="2"></circle>
</svg>
    Initializing...`;

  const file = fileInput.files[0];
  const text = await file.text();

  const json = bookmarksToJSON(text, { stringify: true, formatJSON: true, spaces: 2 });

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const jsonSize = formatFileSize(blob.size / 1024); // 计算JSON文件大小

  statusIndicator.className = 'group gap-2 inline-flex items-center justify-center rounded-full py-2 px-6 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 bg-green-600 text-white hover:text-white hover:bg-green-700 active:bg-green-700 active:text-green-100 focus-visible:outline-green-600';
  statusIndicator.innerHTML = `<a href="${url}" download="pintree.json">Download JSON</a>`;
  fileNameDisplay.textContent = 'pintree.json';
  fileSizeDisplay.textContent = `Size: ${jsonSize}`;
});