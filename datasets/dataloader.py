from pathlib import Path
from torchvision import datasets, transforms
from torch.utils.data import DataLoader


def build_transforms(image_size: int = 512, train: bool = True):
    if train:
        return transforms.Compose(
            [
                transforms.Resize((image_size, image_size)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomRotation(10),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )
    return transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )


def build_dataloader(data_dir: str, split: str, batch_size: int = 16, image_size: int = 512, workers: int = 2):
    root = Path(data_dir) / split
    dataset = datasets.ImageFolder(root=root, transform=build_transforms(image_size, train=split == "train"))
    return DataLoader(dataset, batch_size=batch_size, shuffle=split == "train", num_workers=workers), dataset.classes
