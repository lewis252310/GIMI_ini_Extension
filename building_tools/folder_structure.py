import os

black_list = ["node_modules"]

root = os.getcwd()

def print_dir_structureV1():
    # pending 的 index 是對應 level 下的子級中 '還有多少子級等待處理' 而不是對應 level 的文件數
    pending = []
    for path, dirs, files in os.walk(root):
        level = path.replace(root, '').count(os.sep)
        pending = pending[:level]
        pending.append(len(dirs) + len(files))
        if level > 0:
            pending[-2] -= 1
        indent = "".join([f"│   " if pending[i] > 0 else "    " for i in range(level)])
        if indent[-4:] == "│   ":
            print(f"{indent[:-4]}├── {os.path.basename(path)}/")
        else:
            print(f"{indent[:-4]}└── {os.path.basename(path)}/")
        
        if all(black in path for black in black_list):
            print(f"{indent}└── < Content has been hidden >")
            dirs[:] = []
            continue
        for f in files:
            subindent = indent + "".join("├── " if pending[-1] > 1 else "└── ")
            print(f'{subindent}{f}')
            pending[-1] -= 1


def print_dir_structureV1_1():
    # pending 的 index 是對應 level 下的子級中 '還有多少子級等待處理' 而不是對應 level 的文件數
    pending = []
    for path, dirs, files in os.walk(root):
        level = path.replace(root, '').count(os.sep)
        pending = pending[:level]
        pending.append(len(dirs) + len(files))

        prefix_parent = "".join([f"│   " if pending[i] > 0 else "    " for i in range(level - 1)])
        if level == 0:
            prefix = ""
        else:
            # 這邊 pending 會取 -2 是因為上面使用了 .append 所以要回溯兩層 而不是當前層
            prefix = prefix_parent + "".join(f"├── " if pending[-2] > 1 else "└── ")
            pending[-2] -= 1
        print(f"{prefix}{os.path.basename(path)}/")


        prefix_parent = "".join(["│   " if pending[i] > 0 else "    " for i in range(level)])
        if all(black in path for black in black_list):
            print(f"{prefix_parent}└── < Content has been hidden >")
            dirs[:] = []
            continue
        for f in files:
            prefix = prefix_parent + "".join("├── " if pending[-1] > 1 else "└── ")
            print(f'{prefix}{f}')
            pending[-1] -= 1


def print_dir_structureV2(path, prefix="", file_in_front=False):
    items = os.listdir(path)
    items.sort(key=lambda x: not os.path.isdir(os.path.join(path, x)), reverse=file_in_front)
    for i, item in enumerate(items):
        is_last = (i == len(items) - 1)
        current_prefix = prefix + ('└── ' if is_last else '├── ')
        full_path = os.path.join(path, item)
        print(current_prefix + item)
        if os.path.isdir(full_path):
            extension = '    ' if is_last else '│   '
            if all(black in full_path for black in black_list):
                print(f"{prefix + extension}└── < Content has been hidden >")
            else:
                print_dir_structureV2(full_path, prefix + extension)

if __name__ == "__main__":
    print_dir_structureV1_1()
    # print_dir_structureV2(root)