from flask import Flask, render_template, request, jsonify
from googleapiclient.discovery import build

app = Flask(__name__)

# API 키 로딩
YOUTUBE_API_KEY = "AIzaSyBE_n565-lD6GCmIJDfWpb5r8cOuiM3cOk"

# API 키 유효성 검사
if not YOUTUBE_API_KEY or "AIza" not in YOUTUBE_API_KEY:
    raise RuntimeError("YouTube API 키가 설정되지 않았거나 올바르지 않습니다.")

# YouTube API 빌더 인스턴스
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

def search_youtube_music(query, max_results=10):
    try:
        search_response = youtube.search().list(
            q=query,
            part='snippet',
            type='video',
            videoCategoryId='10',  # 음악 카테고리
            maxResults=max_results
        ).execute()

        results = []
        for item in search_response.get('items', []):
            video_id = item['id']['videoId']
            snippet = item['snippet']
            results.append({
                'title': snippet['title'],
                'video_id': video_id,
                'thumbnail': snippet['thumbnails']['high']['url'],
                'channel_title': snippet['channelTitle']
            })
        return results
    except Exception as e:
        print(f"🔴 YouTube API Error: {e}")
        return []

def get_kpop_top_charts(max_results=10):
    # 'K-pop 인기' 키워드로 검색하여 인기 차트 컨텐츠를 가져올 수 있습니다.
    return search_youtube_music('K-pop 인기', max_results=max_results)

@app.route('/')
def index():
    kpop_charts = get_kpop_top_charts()
    return render_template('index.html', kpop_charts=kpop_charts)

@app.route('/search', methods=['POST'])
def search():
    query = request.form.get('query', '').strip()
    if not query:
        return jsonify({'error': '검색어를 입력해주세요.'}), 400

    results = search_youtube_music(query)
    if not results:
        return jsonify({'error': '검색 결과가 없습니다.'}), 404

    return jsonify(results)

@app.route('/top-charts')
def top_charts():
    charts = get_kpop_top_charts()
    return jsonify(charts)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)