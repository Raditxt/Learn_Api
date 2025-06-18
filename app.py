from flask import Flask, jsonify, request, render_template
import pyodbc
import json
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# --- Konfigurasi Koneksi Database ---
# GANTI DENGAN DETAIL SQL SERVER ANDA JIKA BERBEDA!
DB_CONFIG = {
    'driver': '{ODBC Driver 17 for SQL Server}', # Pastikan driver ini terinstal dan benar
    'server': 'LAPTOP-ICCIHHC0',                # Nama server/instance SQL Server Anda
    'database': 'DW_Ecommerce',
    'uid': '',                                  # Dikosongkan karena menggunakan Windows Authentication
    'pwd': '',                                  # Dikosongkan karena menggunakan Windows Authentication
    'trusted_connection': 'yes'                 # Set 'yes' untuk Windows Authentication
}

# --- Helper Function untuk Koneksi Database ---
def get_db_connection():
    conn_str = (
        f"DRIVER={DB_CONFIG['driver']};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
    )
    if DB_CONFIG['trusted_connection'].lower() == 'yes':
        conn_str += "Trusted_Connection=yes;"
    else:
        conn_str += f"UID={DB_CONFIG['uid']};PWD={DB_CONFIG['pwd']};"
    
    return pyodbc.connect(conn_str)

# --- API Endpoints Berorientasi Bisnis ---
@app.route('/product')
def product_page():
    return render_template('product.html')

@app.route('/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/penjualan')
def penjualan_page():
    return render_template('penjualan.html')

@app.route('/customers')
def customers_page():
    return render_template('customers.html')

@app.route('/karyawan')
def karyawan_page():
    return render_template('karyawan.html')

# NEW: Endpoint untuk mengambil Key Performance Indicators (KPIs)
# Filters: Year
@app.route('/api/kpis', methods=['GET'])
def get_kpis():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        selected_year = request.args.get('year')
        
        query = """
        SELECT
            SUM(fp.total_harga) AS TotalPenjualan,
            COUNT(DISTINCT dp.id_pesanan) AS TotalPesanan,
            CASE
                WHEN COUNT(DISTINCT dp.id_pesanan) > 0 THEN SUM(fp.total_harga) / COUNT(DISTINCT dp.id_pesanan)
                ELSE 0
            END AS RataRataPenjualanPerPesanan
        FROM
            fakta_penjualan fp
        JOIN
            dim_pesanan dp ON fp.id_pesanan = dp.id_pesanan
        """
        
        params = []
        where_clauses = []

        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dp.tanggal_pesanan) = ? ") # Filter based on dim_pesanan date
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        if not data or data[0]['TotalPenjualan'] is None:
            return jsonify({
                'TotalPenjualan': 0,
                'TotalPesanan': 0,
                'RataRataPenjualanPerPesanan': 0
            })
        return jsonify(data[0])

    except Exception as e:
        print(f"Error fetching KPIs: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# 1. Tren Penjualan Bulanan (Sales Trend)
# Filters: Year, Quarter
@app.route('/api/sales/monthly-trend', methods=['GET'])
def get_monthly_sales_trend():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        selected_year = request.args.get('year')
        selected_quarter = request.args.get('quarter')
        
        query = """
        SELECT
            FORMAT(dp.tanggal_pesanan, 'yyyy-MM') AS BulanPenjualan,
            SUM(fp.total_harga) AS TotalPenjualan,
            COUNT(DISTINCT dp.id_pesanan) AS JumlahPesanan
        FROM
            fakta_penjualan fp
        JOIN
            dim_pesanan dp ON fp.id_pesanan = dp.id_pesanan
        """
        
        params = []
        where_clauses = []

        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dp.tanggal_pesanan) = ? ")
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400

        if selected_quarter:
            try:
                quarter_int = int(selected_quarter)
                if not (1 <= quarter_int <= 4):
                    raise ValueError("Kuartal harus antara 1 dan 4.")
                where_clauses.append(f" DATEPART(quarter, dp.tanggal_pesanan) = ? ")
                params.append(quarter_int)
            except ValueError as ve:
                return jsonify({'error': f'Parameter quarter tidak valid: {ve}'}), 400

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += """
        GROUP BY
            FORMAT(dp.tanggal_pesanan, 'yyyy-MM')
        ORDER BY
            BulanPenjualan;
        """
        
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching monthly sales trend: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# 2. Penjualan per Kategori Produk (Top Performers)
# Filters: Top N, Year
@app.route('/api/sales/by-category', methods=['GET'])
def get_sales_by_category():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        top_n = request.args.get('top_n', default=10, type=int)
        selected_year = request.args.get('year')

        query_template = """
        SELECT TOP (?)
            dk.nama_kategori,
            SUM(fp.total_harga) AS TotalPenjualan,
            COUNT(DISTINCT fp.id_produk) AS JumlahProdukUnikTerjual
        FROM
            fakta_penjualan fp
        JOIN
            dim_produk dp ON fp.id_produk = dp.id_produk
        JOIN
            dim_sub_kategori dsk ON dp.id_sub_kategori = dsk.id_sub_kategori
        JOIN
            dim_kategori_utama dk ON dsk.id_kategori_utama = dk.id_kategori_utama
        JOIN
            dim_pesanan dpes ON fp.id_pesanan = dpes.id_pesanan -- Join with dim_pesanan for year filter
        """
        
        params = [top_n]

        where_clauses = []
        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dpes.tanggal_pesanan) = ? ") # Filter based on dim_pesanan date
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400

        if where_clauses:
            query_template += " WHERE " + " AND ".join(where_clauses)

        query_template += """
        GROUP BY
            dk.nama_kategori
        ORDER BY
            TotalPenjualan DESC;
        """
        
        cursor.execute(query_template, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching sales by category: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# NEW: 3. Penjualan per Brand
# Filters: Top N, Year
@app.route('/api/sales/by-brand', methods=['GET'])
def get_sales_by_brand():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        top_n = request.args.get('top_n', default=10, type=int)
        selected_year = request.args.get('year')

        query_template = """
        SELECT TOP (?)
            dp.brand,
            SUM(fp.total_harga) AS TotalPenjualan,
            COUNT(DISTINCT fp.id_produk) AS JumlahProdukUnikTerjual
        FROM
            fakta_penjualan fp
        JOIN
            dim_produk dp ON fp.id_produk = dp.id_produk
        JOIN
            dim_pesanan dpes ON fp.id_pesanan = dpes.id_pesanan -- Join with dim_pesanan for year filter
        """
        
        params = [top_n]

        where_clauses = []
        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dpes.tanggal_pesanan) = ? ") # Filter based on dim_pesanan date
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400

        if where_clauses:
            query_template += " WHERE " + " AND ".join(where_clauses)

        query_template += """
        GROUP BY
            dp.brand
        ORDER BY
            TotalPenjualan DESC;
        """
        
        cursor.execute(query_template, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching sales by brand: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# NEW: 4. Top N Pelanggan Berdasarkan Penjualan
# Filters: Top N, Year
@app.route('/api/customers/top-spenders', methods=['GET'])
def get_top_spending_customers():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        top_n = request.args.get('top_n', default=10, type=int)
        selected_year = request.args.get('year')

        query_template = """
        SELECT TOP (?)
            dp.nama AS NamaPelanggan,
            SUM(fp.total_harga) AS TotalPembelian,
            COUNT(DISTINCT fp.id_pesanan) AS JumlahPesanan
        FROM
            fakta_penjualan fp
        JOIN
            dim_pelanggan dp ON fp.id_pelanggan = dp.id_pelanggan
        JOIN
            dim_pesanan dpes ON fp.id_pesanan = dpes.id_pesanan -- Join with dim_pesanan for year filter
        """
        
        params = [top_n]

        where_clauses = []
        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dpes.tanggal_pesanan) = ? ") # Filter based on dim_pesanan date
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400

        if where_clauses:
            query_template += " WHERE " + " AND ".join(where_clauses)

        query_template += """
        GROUP BY
            dp.nama
        ORDER BY
            TotalPembelian DESC;
        """
        
        cursor.execute(query_template, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching top spending customers: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# 5. Status Pengiriman Pesanan (Distribusi Status)
# Filters: Year
@app.route('/api/delivery/status-distribution', methods=['GET'])
def get_delivery_status_distribution():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        selected_year = request.args.get('year')

        query = """
        SELECT
            fp.status_pengiriman,
            COUNT(*) AS JumlahPesanan,
            CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) AS Persentase
        FROM
            fakta_pengiriman fp
        JOIN
            dim_pesanan dp ON fp.id_pesanan = dp.id_pesanan -- Join to dim_pesanan for consistent date filtering
        """
        params = []
        where_clauses = []

        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dp.tanggal_pesanan) = ? ")
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400
        
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += """
        GROUP BY
            fp.status_pengiriman
        ORDER BY
            JumlahPesanan DESC;
        """
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching delivery status distribution: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# 6. Rata-rata Waktu Pengiriman per Kurir (Efisiensi Operasional)
# Filters: Year
@app.route('/api/delivery/avg-time-by-courier', methods=['GET'])
def get_avg_delivery_time_by_courier():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        selected_year = request.args.get('year')

        query = """
        SELECT
            fp.kurir, -- Jika 'kurir' adalah VARCHAR di fakta_pengiriman
            -- dk.nama_kurir AS kurir, -- Jika Anda memiliki dim_kurir yang dijoin
            AVG(CAST(DATEDIFF(day, dp.tanggal_pesanan, fp.tanggal_kirim) AS DECIMAL(10,2))) AS RataRataHariPengiriman
        FROM
            fakta_pengiriman fp
        JOIN
            dim_pesanan dp ON fp.id_pesanan = dp.id_pesanan
        -- JOIN
        --     dim_kurir dk ON fp.id_kurir = dk.id_kurir -- Uncomment this if you have dim_kurir and id_kurir in fakta_pengiriman
        WHERE
            fp.tanggal_kirim IS NOT NULL
        """
        params = []
        where_clauses = []

        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dp.tanggal_pesanan) = ? ") # Filter based on dim_pesanan date
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400
        
        if where_clauses:
            query += " AND " + " AND ".join(where_clauses) 

        query += """
        GROUP BY
            fp.kurir -- Jika 'kurir' adalah VARCHAR di fakta_pengiriman
            -- dk.nama_kurir -- Uncomment this if you join dim_kurir
        ORDER BY
            RataRataHariPengiriman ASC;
        """
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching average delivery time by courier: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# NEW: 7. Performa Karyawan Pengiriman (Jumlah Pengiriman)
# Filters: Top N, Year
@app.route('/api/delivery/employee-performance', methods=['GET'])
def get_employee_delivery_performance():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        top_n = request.args.get('top_n', default=10, type=int)
        selected_year = request.args.get('year')

        query_template = """
        SELECT TOP (?)
            dk.nama_karyawan,
            COUNT(fp.id_pengiriman) AS TotalPengiriman,
            AVG(CAST(DATEDIFF(day, dp.tanggal_pesanan, fp.tanggal_kirim) AS DECIMAL(10,2))) AS RataRataHariPengiriman
        FROM
            fakta_pengiriman fp
        JOIN
            dim_karyawan dk ON fp.id_karyawan = dk.id_karyawan
        JOIN
            dim_pesanan dp ON fp.id_pesanan = dp.id_pesanan -- Join to dim_pesanan for consistent date filtering
        WHERE
            fp.tanggal_kirim IS NOT NULL
        """
        
        params = [top_n]

        where_clauses = []
        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dp.tanggal_pesanan) = ? ")
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400

        if where_clauses:
            query_template += " AND " + " AND ".join(where_clauses)

        query_template += """
        GROUP BY
            dk.nama_karyawan
        ORDER BY
            TotalPengiriman DESC;
        """
        
        cursor.execute(query_template, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching employee delivery performance: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# 8. Distribusi Rating Belanja (Kepuasan Pelanggan)
# Filters: Year
@app.route('/api/rating/distribution', methods=['GET'])
def get_rating_distribution():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        selected_year = request.args.get('year')

        query = """
        SELECT
            fr.rating_belanja,
            COUNT(*) AS JumlahRating,
            CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) AS Persentase
        FROM
            fakta_rating fr
        JOIN
            dim_pesanan dp ON fr.id_pesanan = dp.id_pesanan -- Join with dim_pesanan for consistent date filtering
        WHERE
            fr.rating_belanja IS NOT NULL
        """
        params = []
        where_clauses = []

        if selected_year:
            try:
                year_int = int(selected_year)
                where_clauses.append(" YEAR(dp.tanggal_pesanan) = ? ")
                params.append(year_int)
            except ValueError:
                return jsonify({'error': 'Parameter year tidak valid. Harus berupa angka.'}), 400
        
        if where_clauses:
            query += " AND " + " AND ".join(where_clauses) 

        query += """
        GROUP BY
            fr.rating_belanja
        ORDER BY
            fr.rating_belanja ASC;
        """
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching rating distribution: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

# Endpoint untuk mendapatkan tahun-tahun yang tersedia untuk filter
@app.route('/api/available-years', methods=['GET'])
def get_available_years():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
        SELECT DISTINCT YEAR(tanggal_pesanan) AS Tahun
        FROM dim_pesanan -- Mengambil tahun dari dim_pesanan agar konsisten
        WHERE tanggal_pesanan IS NOT NULL
        ORDER BY Tahun DESC;
        """
        cursor.execute(query)
        years = [row[0] for row in cursor.fetchall()]
        return jsonify(years)
    except Exception as e:
        print(f"Error fetching available years: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn: conn.close()

@app.route('/api/products', methods=['POST'])
def create_product():
    """
    Menambahkan produk baru ke database.
    Membutuhkan 'id_produk', 'nama_produk', 'brand', 'id_sub_kategori' dalam body JSON.
    """
    data = request.get_json()
    required_fields = ['id_produk', 'nama_produk', 'brand', 'id_sub_kategori']

    # Memeriksa apakah semua field yang diperlukan ada dalam data
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Data produk tidak lengkap. Pastikan semua field ada.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO dim_produk (id_produk, nama_produk, brand, id_sub_kategori)
            VALUES (?, ?, ?, ?)
        """, (data['id_produk'], data['nama_produk'], data['brand'], data['id_sub_kategori']))
        conn.commit()
        return jsonify({'message': 'Produk berhasil ditambahkan.'}), 201
    except pyodbc.Error as e:
        # Menangani error database spesifik
        sqlstate = e.args[0]
        if '23' in sqlstate: # Contoh: unique constraint violation
            return jsonify({'error': 'ID Produk sudah ada atau terjadi kesalahan duplikasi data.'}), 409
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        # Menangani error umum lainnya
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn: # Pastikan conn ada sebelum mencoba menutup
            conn.close()

@app.route('/api/products/<id_produk>', methods=['PUT'])
def update_product(id_produk):
    """
    Mengupdate detail produk berdasarkan id_produk.
    Menerima field opsional 'nama_produk', 'brand', 'id_sub_kategori' dalam body JSON.
    """
    data = request.get_json()
    fields = []
    values = []

    # Membangun query UPDATE secara dinamis berdasarkan field yang diberikan
    for key in ['nama_produk', 'brand', 'id_sub_kategori']:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])

    if not fields:
        return jsonify({'error': 'Tidak ada data yang diberikan untuk update.'}), 400

    values.append(id_produk) # Menambahkan id_produk untuk klausa WHERE

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            UPDATE dim_produk
            SET {', '.join(fields)}
            WHERE id_produk = ?
        """, values)
        conn.commit()
        
        # Periksa apakah ada baris yang terpengaruh (produk ditemukan dan diupdate)
        if cursor.rowcount == 0:
            return jsonify({'message': 'Produk tidak ditemukan atau tidak ada perubahan yang dilakukan.'}), 404
        
        return jsonify({'message': 'Produk berhasil diupdate.'}), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/products/<id_produk>', methods=['DELETE'])
def delete_product(id_produk):
    """
    Menghapus produk dari database berdasarkan id_produk.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dim_produk WHERE id_produk = ?", (id_produk,))
        conn.commit()
        
        # Periksa apakah ada baris yang terpengaruh (produk ditemukan dan dihapus)
        if cursor.rowcount == 0:
            return jsonify({'message': 'Produk tidak ditemukan.'}), 404

        return jsonify({'message': 'Produk berhasil dihapus.'}), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Ambil parameter query
        id_produk = request.args.get('id_produk')
        nama_produk = request.args.get('nama_produk')
        brand = request.args.get('brand')
        id_sub_kategori = request.args.get('id_sub_kategori')

        # Bangun query dinamis
        query = "SELECT id_produk, nama_produk, brand, id_sub_kategori FROM dim_produk WHERE 1=1"
        params = []

        if id_produk:
            query += " AND id_produk LIKE ?"
            params.append(f"%{id_produk}%")
        if nama_produk:
            query += " AND nama_produk LIKE ?"
            params.append(f"%{nama_produk}%")
        if brand:
            query += " AND brand LIKE ?"
            params.append(f"%{brand}%")
        if id_sub_kategori:
            query += " AND id_sub_kategori LIKE ?"
            params.append(f"%{id_sub_kategori}%")

        cursor.execute(query, params)
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        data = [dict(zip(columns, row)) for row in rows]
        return jsonify(data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/customers', methods=['GET'])
def get_customers():
    """
    Mengambil semua pelanggan dari database.
    Mengembalikan daftar pelanggan dalam format JSON.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Memilih kolom yang sesuai dengan struktur tabel dim_pelanggan yang baru
        cursor.execute("SELECT id_pelanggan, nama, email, alamat, nomor_telepon FROM dim_pelanggan")
        customers = cursor.fetchall()
        customer_list = [dict(zip([column[0] for column in cursor.description], row)) for row in customers]
        return jsonify(customer_list), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/customers', methods=['POST'])
def create_customer():
    """
    Menambahkan pelanggan baru ke database.
    Membutuhkan 'id_pelanggan', 'nama', 'email', 'alamat', 'nomor_telepon' dalam body JSON.
    """
    data = request.get_json()
    # Required fields sesuai dengan struktur tabel yang baru
    required_fields = ['id_pelanggan', 'nama', 'email', 'alamat', 'nomor_telepon']

    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Data pelanggan tidak lengkap. Pastikan semua field ada.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO dim_pelanggan (id_pelanggan, nama, email, alamat, nomor_telepon)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data['id_pelanggan'], data['nama'], data['email'],
            data['alamat'], data['nomor_telepon']
        ))
        conn.commit()
        return jsonify({'message': 'Pelanggan berhasil ditambahkan.'}), 201
    except pyodbc.Error as e:
        sqlstate = e.args[0]
        if '23' in sqlstate: # Contoh: unique constraint violation
            return jsonify({'error': 'ID Pelanggan sudah ada atau terjadi kesalahan duplikasi data.'}), 409
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/customers/<id_pelanggan>', methods=['PUT'])
def update_customer(id_pelanggan):
    """
    Mengupdate detail pelanggan berdasarkan id_pelanggan.
    Menerima field opsional 'nama', 'email', 'alamat', 'nomor_telepon' dalam body JSON.
    """
    data = request.get_json()
    fields = []
    values = []

    # Field yang dapat diupdate sesuai struktur tabel yang baru
    for key in ['nama', 'email', 'alamat', 'nomor_telepon']:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])

    if not fields:
        return jsonify({'error': 'Tidak ada data yang diberikan untuk update.'}), 400

    values.append(id_pelanggan) # Menambahkan id_pelanggan untuk klausa WHERE

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            UPDATE dim_pelanggan
            SET {', '.join(fields)}
            WHERE id_pelanggan = ?
        """, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'message': 'Pelanggan tidak ditemukan atau tidak ada perubahan yang dilakukan.'}), 404
            
        return jsonify({'message': 'Pelanggan berhasil diupdate.'}), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/customers/<id_pelanggan>', methods=['DELETE'])
def delete_customer(id_pelanggan):
    """
    Menghapus pelanggan dari database berdasarkan id_pelanggan.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dim_pelanggan WHERE id_pelanggan = ?", (id_pelanggan,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'message': 'Pelanggan tidak ditemukan.'}), 404
            
        return jsonify({'message': 'Pelanggan berhasil dihapus.'}), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/employees', methods=['GET'])
def get_employees():
    """
    Mengambil semua karyawan dari database.
    Mengembalikan daftar karyawan dalam format JSON.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Memilih kolom yang sesuai dengan struktur tabel dim_karyawan yang baru
        cursor.execute("SELECT id_karyawan, nama_karyawan, jabatan, nomor_telepon FROM dim_karyawan")
        employees = cursor.fetchall()
        employee_list = [dict(zip([column[0] for column in cursor.description], row)) for row in employees]
        return jsonify(employee_list), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/employees', methods=['POST'])
def create_employee():
    """
    Menambahkan karyawan baru ke database.
    Membutuhkan 'id_karyawan', 'nama_karyawan', 'jabatan', 'nomor_telepon' dalam body JSON.
    """
    data = request.get_json()
    # Required fields sesuai dengan struktur tabel dim_karyawan yang baru
    required_fields = ['id_karyawan', 'nama_karyawan', 'jabatan', 'nomor_telepon']

    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Data karyawan tidak lengkap. Pastikan semua field ada.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO dim_karyawan (id_karyawan, nama_karyawan, jabatan, nomor_telepon)
            VALUES (?, ?, ?, ?)
        """, (
            data['id_karyawan'], data['nama_karyawan'], data['jabatan'], data['nomor_telepon']
        ))
        conn.commit()
        return jsonify({'message': 'Karyawan berhasil ditambahkan.'}), 201
    except pyodbc.Error as e:
        sqlstate = e.args[0]
        if '23' in sqlstate: # Contoh: unique constraint violation
            return jsonify({'error': 'ID Karyawan sudah ada atau terjadi kesalahan duplikasi data.'}), 409
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/employees/<id_karyawan>', methods=['PUT'])
def update_employee(id_karyawan):
    """
    Mengupdate detail karyawan berdasarkan id_karyawan.
    Menerima field opsional 'nama_karyawan', 'jabatan', 'nomor_telepon' dalam body JSON.
    """
    data = request.get_json()
    fields = []
    values = []

    # Field yang dapat diupdate sesuai struktur tabel yang baru
    for key in ['nama_karyawan', 'jabatan', 'nomor_telepon']:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])

    if not fields:
        return jsonify({'error': 'Tidak ada data yang diberikan untuk update.'}), 400

    values.append(id_karyawan) # Menambahkan id_karyawan untuk klausa WHERE

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            UPDATE dim_karyawan
            SET {', '.join(fields)}
            WHERE id_karyawan = ?
        """, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'message': 'Karyawan tidak ditemukan atau tidak ada perubahan yang dilakukan.'}), 404
            
        return jsonify({'message': 'Karyawan berhasil diupdate.'}), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/employees/<id_karyawan>', methods=['DELETE'])
def delete_employee(id_karyawan):
    """
    Menghapus karyawan dari database berdasarkan id_karyawan.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dim_karyawan WHERE id_karyawan = ?", (id_karyawan,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'message': 'Karyawan tidak ditemukan.'}), 404
            
        return jsonify({'message': 'Karyawan berhasil dihapus.'}), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/sales', methods=['POST'])
def create_sales():
    """
    Menambahkan transaksi penjualan baru ke database.
    Membutuhkan 'id_detail', 'id_produk', 'id_pelanggan', 'id_pesanan',
    'jumlah', 'harga_satuan', 'total_harga', 'tanggal_pesanan', 'status_pesanan' dalam body JSON.
    """
    data = request.get_json()
    # Required fields sesuai dengan struktur tabel fakta_penjualan yang baru
    required_fields = ['id_detail', 'id_produk', 'id_pelanggan', 'id_pesanan', 'jumlah', 'harga_satuan', 'total_harga', 'tanggal_pesanan', 'status_pesanan']

    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Data penjualan tidak lengkap. Pastikan semua field ada.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO fakta_penjualan (id_detail, id_produk, id_pelanggan, id_pesanan, jumlah, harga_satuan, total_harga, tanggal_pesanan, status_pesanan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['id_detail'], data['id_produk'], data['id_pelanggan'], data['id_pesanan'],
            data['jumlah'], data['harga_satuan'], data['total_harga'],
            data['tanggal_pesanan'], data['status_pesanan']
        ))
        conn.commit()
        return jsonify({'message': 'Transaksi penjualan berhasil ditambahkan.'}), 201
    except pyodbc.Error as e:
        sqlstate = e.args[0]
        if '23' in sqlstate: # Contoh: unique constraint violation
            return jsonify({'error': 'ID Detail Penjualan sudah ada atau terjadi kesalahan duplikasi data.'}), 409
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/sales', methods=['GET'])
def get_sales():
    """
    Mengambil semua transaksi penjualan dari database.
    Mengembalikan daftar transaksi dalam format JSON.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Memilih kolom yang sesuai dengan struktur tabel fakta_penjualan yang baru
        cursor.execute("SELECT id_detail, id_produk, id_pelanggan, id_pesanan, jumlah, harga_satuan, total_harga, tanggal_pesanan, status_pesanan FROM fakta_penjualan")
        sales = cursor.fetchall()
        # Menangani kolom tanggal_pesanan agar diformat dengan benar sebagai string
        sales_list = []
        for row in sales:
            sale_dict = dict(zip([column[0] for column in cursor.description], row))
            if isinstance(sale_dict.get('tanggal_pesanan'), datetime):
                sale_dict['tanggal_pesanan'] = sale_dict['tanggal_pesanan'].strftime('%Y-%m-%d')
            sales_list.append(sale_dict)
            
        return jsonify(sales_list), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/sales/<id_detail>', methods=['PUT'])
def update_sales(id_detail):
    """
    Mengupdate detail transaksi penjualan berdasarkan id_detail.
    Menerima field opsional 'id_produk', 'id_pelanggan', 'id_pesanan',
    'jumlah', 'harga_satuan', 'total_harga', 'tanggal_pesanan', 'status_pesanan' dalam body JSON.
    """
    data = request.get_json()
    fields = []
    values = []

    for key in ['id_produk', 'id_pelanggan', 'id_pesanan', 'jumlah', 'harga_satuan', 'total_harga', 'tanggal_pesanan', 'status_pesanan']:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])

    if not fields:
        return jsonify({'error': 'Tidak ada data yang diberikan untuk update.'}), 400

    values.append(id_detail) # Menambahkan id_detail untuk klausa WHERE

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            UPDATE fakta_penjualan
            SET {', '.join(fields)}
            WHERE id_detail = ?
        """, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'message': 'Transaksi penjualan tidak ditemukan atau tidak ada perubahan yang dilakukan.'}), 404
            
        return jsonify({'message': 'Transaksi penjualan berhasil diupdate.'}), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()

@app.route('/api/sales/<id_detail>', methods=['DELETE'])
def delete_sales(id_detail):
    """
    Menghapus transaksi penjualan dari database berdasarkan id_detail.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM fakta_penjualan WHERE id_detail = ?", (id_detail,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'message': 'Transaksi penjualan tidak ditemukan.'}), 404
            
        return jsonify({'message': 'Transaksi penjualan berhasil dihapus.'}), 200
    except pyodbc.Error as e:
        return jsonify({'error': f"Kesalahan database: {str(e)}"}), 500
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if 'conn' in locals() and conn:
            conn.close()


if __name__ == '__main__':
    app.run(debug=True)