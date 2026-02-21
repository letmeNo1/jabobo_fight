import pytest
import requests
import json
from datetime import datetime

# ------------------- 测试配置 -------------------
BASE_URL = "http://121.41.168.85:8009/api"

# 已手动创建的管理员账号
ADMIN_USER = {
    "username": "admin_test",
    "password": "admin123456"
}

# 测试用普通玩家账号
TEST_PLAYER = {
    "username": f"player_test_{datetime.now().strftime('%Y%m%d%H%M%S')}",
    "password": "player123456",
    "player_name": "测试玩家001",
    "role": "Player"
}

# 全局变量
test_data = {
    "admin_account_id": None,
    "test_player_account_id": None,
    "test_player_id": None
}

# ------------------- 通用工具函数 -------------------
def print_response(resp, desc):
    """打印接口返回值"""
    print(f"\n===== {desc} =====")
    print(f"状态码: {resp.status_code}")
    try:
        print(f"响应体: {json.dumps(resp.json(), ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"响应体: {resp.text}")
        print(f"解析JSON失败: {str(e)}")
    print("====================\n")

def login(username, password):
    """通用登录函数"""
    url = f"{BASE_URL}/auth/login"
    data = {"username": username, "password": password}
    resp = requests.post(url, json=data)
    print_response(resp, f"登录接口 - {username}")
    return resp

# ------------------- 测试用例 -------------------
class TestQfightAPI:
    def setup_class(self):
        """初始化：验证管理员登录"""
        # 管理员登录
        admin_resp = login(ADMIN_USER["username"], ADMIN_USER["password"])
        if admin_resp.status_code != 200:
            raise Exception(f"管理员登录失败：{admin_resp.text}")
        test_data["admin_account_id"] = admin_resp.json()["data"]["account_id"]
        print(f"✅ 管理员登录成功，账号ID：{test_data['admin_account_id']}")

    # 1. 测试注册接口（修复：添加req嵌套字段）
    def test_01_register_user(self):
        """测试管理员创建普通玩家"""
        url = f"{BASE_URL}/auth/register"
        # 关键修复：原API接收的是 req: UserRegisterRequest，必须嵌套在req字段中
        data = {
            # get_current_user依赖的username（管理员身份）
            "username": ADMIN_USER["username"],
            # 注册参数嵌套在req中（匹配原API的 req: UserRegisterRequest）
            "req": {
                "username": TEST_PLAYER["username"],
                "password": TEST_PLAYER["password"],
                "player_name": TEST_PLAYER["player_name"],
                "role": TEST_PLAYER["role"]
            }
        }
        resp = requests.post(url, json=data)
        print_response(resp, f"注册接口 - 创建玩家 {TEST_PLAYER['username']}")
        
        # 断言注册成功
        assert resp.status_code == 200, f"注册失败：{resp.text}"
        assert resp.json()["success"] is True
        
        # 存储新玩家ID
        test_data["test_player_account_id"] = resp.json()["data"]["account_id"]
        test_data["test_player_id"] = resp.json()["data"]["player_id"]
        print(f"✅ 测试玩家注册成功，账号ID：{test_data['test_player_account_id']}")

    # 2. 测试登录接口
    def test_02_login_user(self):
        """测试普通玩家登录"""
        # 正向：正确账号密码
        player_resp = login(TEST_PLAYER["username"], TEST_PLAYER["password"])
        assert player_resp.status_code == 200
        assert player_resp.json()["data"]["account_id"] == test_data["test_player_account_id"]
        
        # 反向：错误密码
        wrong_pwd_resp = login(TEST_PLAYER["username"], "wrong_123456")
        assert wrong_pwd_resp.status_code == 401
        
        # 反向：不存在的账号
        no_user_resp = login(f"no_user_{datetime.now().timestamp()}", "123456")
        assert no_user_resp.status_code == 401
        print("✅ 登录接口测试通过（正向+反向）")

    # 3. 测试获取玩家数据（修复：确保account_id有值）
    def test_03_get_player_data(self):
        """测试查询玩家数据"""
        url = f"{BASE_URL}/player/data"
        # 确保account_id不为空
        assert test_data["test_player_account_id"] is not None, "测试玩家账号ID为空"
        params = {"account_id": test_data["test_player_account_id"]}
        resp = requests.get(url, params=params)
        print_response(resp, "获取玩家数据接口")
        
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["data"]["account_id"] == test_data["test_player_account_id"]
        assert isinstance(resp.json()["data"]["weapons"], list)
        assert isinstance(resp.json()["data"]["dressing"], dict)
        print("✅ 获取玩家数据接口测试通过")

    # 4. 测试更新玩家数据（修复：参数嵌套+身份校验）
    def test_04_update_player_data(self):
        """测试更新玩家数据"""
        url = f"{BASE_URL}/player/update"
        
        # 场景1：玩家本人更新（参数嵌套在req中）
        update_self_data = {
            "username": TEST_PLAYER["username"],  # 玩家身份
            "req": {
                "account_id": test_data["test_player_account_id"],
                "level": 10,
                "gold": 1000,
                "str": 15,
                "weapons": ["青龙刀", "金箍棒"]
            }
        }
        resp_self = requests.put(url, json=update_self_data)
        print_response(resp_self, "玩家本人更新数据")
        assert resp_self.status_code == 200
        
        # 验证更新结果
        get_resp = requests.get(f"{BASE_URL}/player/data", params={"account_id": test_data["test_player_account_id"]})
        assert get_resp.json()["data"]["level"] == 10
        assert get_resp.json()["data"]["gold"] == 1000
        
        # 场景2：管理员更新玩家（参数嵌套在req中）
        update_admin_data = {
            "username": ADMIN_USER["username"],  # 管理员身份
            "req": {
                "account_id": test_data["test_player_account_id"],
                "exp": 500,
                "agi": 20
            }
        }
        resp_admin = requests.put(url, json=update_admin_data)
        print_response(resp_admin, "管理员更新玩家数据")
        assert resp_admin.status_code == 200
        
        # 场景3：普通玩家更新管理员（无权限）
        update_other_data = {
            "username": TEST_PLAYER["username"],
            "req": {
                "account_id": test_data["admin_account_id"],
                "level": 99
            }
        }
        resp_other = requests.put(url, json=update_other_data)
        print_response(resp_other, "普通玩家更新管理员数据（无权限）")
        assert resp_other.status_code == 403
        print("✅ 更新玩家数据接口测试通过")

    # 5. 测试重置玩家数据（修复：参数格式+account_id非空）
    def test_05_reset_player_data(self):
        """测试重置玩家数据"""
        url = f"{BASE_URL}/player/reset"
        # 确保account_id非空
        assert test_data["test_player_account_id"] is not None, "测试玩家账号ID为空"
        
        # 正确格式：Query传account_id，Body传username（embed=False的正确格式）
        params = {"account_id": test_data["test_player_account_id"]}
        # get_current_user的username是embed=False，直接传字符串（而非字典）
        data = ADMIN_USER["username"]
        
        resp_reset = requests.post(url, params=params, json=data)
        print_response(resp_reset, "管理员重置玩家数据")
        assert resp_reset.status_code == 200
        
        # 验证重置结果
        get_resp = requests.get(f"{BASE_URL}/player/data", params={"account_id": test_data["test_player_account_id"]})
        assert get_resp.json()["data"]["level"] == 1
        assert get_resp.json()["data"]["gold"] == 500
        
        # 反向测试：普通玩家重置（无权限）
        data_player = TEST_PLAYER["username"]
        resp_player = requests.post(url, params=params, json=data_player)
        print_response(resp_player, "普通玩家重置数据（无权限）")
        assert resp_player.status_code == 403
        print("✅ 重置玩家数据接口测试通过")

# ------------------- 运行测试 -------------------
if __name__ == "__main__":
    pytest.main([
        __file__,
        "-v",
        "-s",
        "--tb=short"
    ])