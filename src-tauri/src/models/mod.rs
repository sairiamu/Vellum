use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct FileMeta {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
}

#[derive(Serialize, Deserialize)]
pub struct TreeNode {
    pub path: String,
    pub name: String,
    pub children: Option<Vec<TreeNode>>,
}
