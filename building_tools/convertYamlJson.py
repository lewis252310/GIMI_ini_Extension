import os, sys, argparse, re
import json
import yaml


def folded_string_constructor(loader, node):
    value = loader.construct_scalar(node)
    # if is '>' mark for multiline strings value in yaml file
    # replace newline and any leading space to empty string
    if node.style == '>':
    # if isinstance(value, str) and '\n' in value:
        value = re.sub(r"\n\s*", '', value)
    return value

yaml.add_constructor('tag:yaml.org,2002:str', folded_string_constructor, Loader=yaml.SafeLoader)


# DEFAULT_YAML = "./gimi-ini_extension/syntaxes/gimi_ini.tmLanguage.yaml"
# DEFAULT_JSON = "./gimi-ini_extension/syntaxes/gimi_ini.tmLanguage.json"
DEFAULT_YAML = "gimi_ini.tmLanguage.yaml"
DEFAULT_JSON = "gimi_ini.tmLanguage.json"


def check_file_extn(json_file, yaml_file):
    _, jf_extn = os.path.splitext(json_file)
    if jf_extn.lower() != ".json":
        print(f"Error: {json_file} does not have the correct extension {jf_extn}")
        sys.exit(1)
    _, yf_extn = os.path.splitext(yaml_file)
    if yf_extn.lower() != ".yaml":
        print(f"Error: {yaml_file} does not have the correct extension {yf_extn}")
        sys.exit(1)

def yaml_to_json(yaml_file, json_file):
    check_file_extn(json_file, yaml_file)
    with open(yaml_file, 'r', encoding="utf-8") as yf:
        yaml_data = yaml.safe_load(yf)
    with open(json_file, 'w', encoding="utf-8") as jf:
        json.dump(yaml_data, jf, indent=4)

def json_to_yaml(json_file, yaml_file):
    check_file_extn(json_file, yaml_file)
    with open(json_file, 'r', encoding="utf-8") as jf:
        json_data = json.load(jf)
    with open(yaml_file, 'w', encoding="utf-8") as yf:
        yaml.dump(json_data, yf, default_flow_style=False, allow_unicode=True)

def test_ground(yaml_file, json_file):
    check_file_extn(json_file, yaml_file)
    with open(yaml_file, 'r', encoding="utf-8") as yf:
        yaml_data = yaml.safe_load(yf)

    text: str = yaml_data['repository']['section_Key']['patterns'][1]['matchB']
    print(f"{repr(text)}\n\n")
    print(text)

    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Convert YAML to JSON or JSON to YAML")
    parser.add_argument("direction", choices=["y2j", "j2y"], help="Conversion direction: 'y2j' or 'j2y'")
    parser.add_argument("--input_file", help="Path to the input file (YAML or JSON)")
    parser.add_argument("--output_file", help="Path to the output file (JSON or YAML)")    
    args = parser.parse_args()

    if args.direction == "y2j":
        input = args.input_file if args.input_file else DEFAULT_YAML
        output = args.output_file if args.output_file else DEFAULT_JSON
        proc_func = yaml_to_json
    
    elif args.direction == "j2y":
        if not args.input_file or not args.output_file:
            print("Error: For 'json-to-yaml', both input_file and output_file must be specified.")
            exit(1)
        input = args.input_file
        output = args.output_file
        proc_func = json_to_yaml
    
    # test_ground(input, output)
    
    proc_func(input, output)
    print(f"Converted")
    print(f" _> '{input}'")
    print(f"to")
    print(f" _> '{output}'")
    print(f"successfully!")

if __name__ == "__main__":
    main()
