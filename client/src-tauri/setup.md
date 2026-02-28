
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Create Android SDK directory
mkdir -p $HOME/Android/cmdline-tools
cd $HOME/Android/cmdline-tools

# Download Android command line tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip

# Extract and organize
unzip -q cmdline-tools.zip
mkdir -p latest
mv cmdline-tools/* latest/
rm cmdline-tools.zip

# Accept licenses
yes | sdkmanager --licenses

# Install required SDK components
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.2.12479018"

# Set NDK_HOME
export NDK_HOME=$ANDROID_HOME/ndk/27.2.12479018

# Persist Environment Variables
echo 'export ANDROID_HOME=$HOME/Android' >> ~/.bashrc
echo 'export NDK_HOME=$ANDROID_HOME/ndk/27.2.12479018' >> ~/.bashrc
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc

# If using SDKMAN
sdk install java 17.0.17-amzn
sdk use java 17.0.17-amzn

# Or using apt (Ubuntu/Debian)
# sudo apt update
# sudo apt install -y openjdk-17-jdk

# Install Rust Android Targets
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android

cd /path/to/your/project/client
npm run build  # Build frontend first
npm run tauri android build -- --target aarch64
```
