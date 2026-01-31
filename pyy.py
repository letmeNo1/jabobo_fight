from PIL import Image
import os
import sys

def add_transparent_border(image_path, save_path, top=0, bottom=0, left=0, right=0):
    """
    给单张图片添加透明边框
    :param image_path: 原图片路径
    :param save_path: 处理后图片保存路径
    :param top: 顶部透明边框像素
    :param bottom: 底部透明边框像素
    :param left: 左侧透明边框像素
    :param right: 右侧透明边框像素
    """
    try:
        # 打开图片，保留原有的alpha通道（透明通道）
        with Image.open(image_path) as img:
            # 关键：将图片转换为RGBA模式（必须，否则无法添加透明通道）
            # 即使原图片是RGB（如JPG），也会自动添加alpha通道，透明区域为全透
            img = img.convert("RGBA")
            # 获取原图片的宽高
            original_w, original_h = img.size
            # 计算新图片的宽高（原尺寸+边框尺寸）
            new_w = original_w + left + right
            new_h = original_h + top + bottom

            # 创建新的透明画布（RGBA模式，背景色(0,0,0,0)表示完全透明）
            new_img = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 0))
            # 将原图片粘贴到新画布的指定位置（left, top）
            new_img.paste(img, (left, top))
            # 保存处理后的图片（PNG支持透明，JPG会自动忽略透明变为白色）
            new_img.save(save_path)
            print(f"处理成功：{os.path.basename(image_path)} -> {os.path.basename(save_path)}")
    except Exception as e:
        print(f"处理失败：{os.path.basename(image_path)}，错误：{str(e)}")

def batch_process_images(input_dir, output_dir, top=20, bottom=20, left=20, right=20, img_formats=('png', 'jpg', 'jpeg', 'bmp', 'gif')):
    """
    批量处理目录下的所有图片
    :param input_dir: 原图片所在目录（绝对/相对路径均可）
    :param output_dir: 处理后图片的保存目录（自动创建）
    :param top/bottom/left/right: 四个方向的透明边框像素（默认各20像素）
    :param img_formats: 支持处理的图片格式（小写）
    """
    # 检查输入目录是否存在
    if not os.path.isdir(input_dir):
        print(f"错误：输入目录 {input_dir} 不存在！")
        sys.exit(1)
    # 创建输出目录（如果不存在）
    os.makedirs(output_dir, exist_ok=True)

    # 遍历输入目录下的所有文件
    for file_name in os.listdir(input_dir):
        file_path = os.path.join(input_dir, file_name)
        # 跳过目录，只处理文件
        if os.path.isfile(file_path):
            # 获取文件后缀（小写），判断是否为支持的图片格式
            file_suffix = file_name.split('.')[-1].lower()
            if file_suffix in img_formats:
                # 拼接处理后的保存路径（与原文件名相同）
                save_path = os.path.join(output_dir, file_name)
                # 处理单张图片
                add_transparent_border(file_path, save_path, top, bottom, left, right)

# ------------------- 核心配置区（修改这里即可）-------------------
if __name__ == "__main__":
    # 1. 原图片所在目录（请修改为你的图片路径，相对/绝对都可以）
    INPUT_DIRECTORY = r"C:\Users\Administrator\Desktop\AI label\jabobo_fight\images2"  # 例：当前目录下的images文件夹，绝对路径如r"C:\Users\XXX\Pictures\test"
    # 2. 处理后图片保存目录（自动创建，无需手动建）
    OUTPUT_DIRECTORY = "images_with_transparent_border"
    # 3. 透明边框尺寸（像素）：可自定义上下左右，比如只加左右边框则top=0, bottom=0
    BORDER_TOP = 300     # 顶部透明边框
    BORDER_BOTTOM = 300  # 底部透明边框
    BORDER_LEFT = 300    # 左侧透明边框
    BORDER_RIGHT = 300   # 右侧透明边框
    # 4. 可选：指定只处理某类格式，比如只处理png：img_formats=('png',)
    SUPPORT_FORMATS = ('png', 'jpg', 'jpeg', 'bmp', 'gif')

    # 执行批量处理
    batch_process_images(
        input_dir=INPUT_DIRECTORY,
        output_dir=OUTPUT_DIRECTORY,
        top=BORDER_TOP,
        bottom=BORDER_BOTTOM,
        left=BORDER_LEFT,
        right=BORDER_RIGHT,
        img_formats=SUPPORT_FORMATS
    )
    print("="*50)
    print(f"批量处理完成！处理后的图片保存在：{os.path.abspath(OUTPUT_DIRECTORY)}")