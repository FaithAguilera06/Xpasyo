<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Popup Example</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
            margin: 0;
            padding: 20px;
        }

        .popup {
            display: none; 
            position: fixed; 
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }

        .popup-content {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            width: 400px; /* Changed to make it wider */
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); /* Added shadow */
        }

        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }

        .container {
            border: 1px solid #ddd;
            padding: 10px;
            background-color: #F5F5F5;
            border-radius: 8px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #333;
            color: #FFF;
            padding: 10px;
            border-radius: 8px 8px 0 0; /* Rounded top corners */
        }

        .header-item {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            width: 100px;
        }

        .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #EEE;
            padding: 10px;
        }

        .row-item {
            text-align: center;
            flex: 1; /* Distributes space evenly */
        }

        .paid-status {
            background-color: #FFA500;
            color: #FFF;
            text-align: center;
            font-weight: bold;
            padding: 5px;
            border-radius: 5px;
            flex-shrink: 0; /* Prevents it from shrinking */
        }

        .content {
            padding: 10px;
            margin-top: 10px;
        }

        .content p {
            margin: 0;
            line-height: 1.5;
            color: #333; /* Darker text for readability */
        }

        button {
            padding: 10px 15px;
            background-color: #007BFF;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }

        button:hover {
            background-color: #0056b3; /* Darker blue on hover */
        }
    </style>
</head>
<body>

    <button id="openPopup">Open Popup</button>

    <div id="popup" class="popup">
        <div class="popup-content">
            <span class="close" id="closePopup">&times;</span>
            <div class="container">
                <div class="header">
                    <div class="header-item">DATE</div>
                    <div class="header-item">COACH NAME</div>
                    <div class="header-item">TIME</div>
                    <div class="header-item">PAID</div>
                </div>
                <div class="row">
                    <div class="row-item">ZUMBA</div>
                    <div class="row-item">ZUMBA</div>
                    <div class="row-item">ZUMBA</div>
                    <div class="paid-status">PAID</div>
                </div>
                <div class="content">
                    <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
                    <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.getElementById("openPopup").onclick = function() {
            document.getElementById("popup").style.display = "flex"; // Change display to flex
        }

        document.getElementById("closePopup").onclick = function() {
            document.getElementById("popup").style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target === document.getElementById("popup")) {
                document.getElementById("popup").style.display = "none";
            }
        }
    </script>
</body>
</html>
